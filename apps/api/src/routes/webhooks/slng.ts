import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { LeadInput } from "@leadloop/shared";
import { LeadInputSchema } from "@leadloop/shared";
import { createLogger } from "../../lib/logger.js";
import { processLead } from "../../pipeline.js";
import {
  createNote,
  createTask,
  fetchPersonContext,
  findPersonByEmail,
  findPersonByPhone,
} from "../../services/attio.js";

const logger = createLogger("slng-webhook");

export const SlngWebhookPayloadSchema = z.object({
  call_id: z.string().min(1),
  lead_email: z.string().email().nullable(),
  lead_phone: z.string().nullable(),
  summary: z.string().min(1),
  transcript: z.string().nullable(),
  duration_seconds: z.number().nullable(),
  timestamp: z.string().min(1),
});

export type SlngWebhookPayload = z.infer<typeof SlngWebhookPayloadSchema>;

export interface SlngWebhookResponse {
  ok: true;
}

function buildNoteBody(summary: string, transcript: string | null): string {
  const parts = [summary];
  if (transcript?.trim()) {
    parts.push("", "Transcript:", transcript.trim());
  }
  return parts.join("\n");
}

function buildLeadInput(
  context: Awaited<ReturnType<typeof fetchPersonContext>>,
  payload: SlngWebhookPayload,
): LeadInput | null {
  if (!context) return null;

  const email = payload.lead_email ?? context.email;
  if (!email) {
    logger.warn(
      { slng_call_id: payload.call_id, attio_person_id: context.personId },
      "Cannot build lead input — no email on payload or Attio person",
    );
    return null;
  }

  const company = context.companyName ?? "Unknown Company";
  const candidate: LeadInput = {
    name: context.name,
    email,
    company,
    phone: payload.lead_phone ?? context.phone,
    source: "slng_webhook",
    message: `SLNG call (${payload.call_id}): ${payload.summary}`,
    domain: undefined,
  };

  const parsed = LeadInputSchema.safeParse(candidate);
  if (!parsed.success) {
    logger.warn(
      {
        slng_call_id: payload.call_id,
        attio_person_id: context.personId,
        issues: parsed.error.issues,
      },
      "Lead input validation failed for pipeline replay",
    );
    return null;
  }

  return parsed.data;
}

function triggerPipelineReplay(leadInput: LeadInput, callId: string, personId: string): void {
  void processLead(leadInput)
    .then((result) => {
      logger.info(
        {
          slng_call_id: callId,
          attio_person_id: personId,
          replay_triggered: true,
          lead_run_id: result.leadRunId,
          status: result.status,
        },
        "SLNG pipeline replay completed",
      );
    })
    .catch((err) => {
      logger.warn(
        {
          slng_call_id: callId,
          attio_person_id: personId,
          replay_triggered: false,
          err: err instanceof Error ? err.message : String(err),
        },
        "Pipeline replay failed",
      );
    });
}

export async function handleSlngWebhook(body: unknown): Promise<SlngWebhookResponse> {
  const parsed = SlngWebhookPayloadSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn(
      { issues: parsed.error.issues },
      "SLNG webhook payload validation failed — acknowledging anyway",
    );
    return { ok: true };
  }

  const payload = parsed.data;
  const logBase = {
    slng_call_id: payload.call_id,
    lead_email: payload.lead_email,
    lead_phone: payload.lead_phone,
  };

  try {
    let personId: string | null = null;

    if (payload.lead_email) {
      personId = await findPersonByEmail(payload.lead_email);
    }
    if (!personId && payload.lead_phone) {
      personId = await findPersonByPhone(payload.lead_phone);
    }

    if (!personId) {
      logger.warn(
        { ...logBase, attio_person_id: null, replay_triggered: false },
        "No Attio person match for SLNG webhook",
      );
      return { ok: true };
    }

    const noteBody = buildNoteBody(payload.summary, payload.transcript);
    try {
      await createNote(personId, noteBody, "SLNG Call Summary");
    } catch (err) {
      logger.warn(
        {
          ...logBase,
          attio_person_id: personId,
          err: err instanceof Error ? err.message : String(err),
        },
        "Failed to create SLNG call summary note in Attio",
      );
    }

    if (payload.duration_seconds !== null && payload.duration_seconds > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      try {
        await createTask(personId, "Review SLNG Call", payload.summary, dueDate);
      } catch (err) {
        logger.warn(
          {
            ...logBase,
            attio_person_id: personId,
            err: err instanceof Error ? err.message : String(err),
          },
          "Failed to create SLNG review task in Attio",
        );
      }
    }

    const context = await fetchPersonContext(personId);
    const leadInput = buildLeadInput(context, payload);
    if (leadInput) {
      triggerPipelineReplay(leadInput, payload.call_id, personId);
      logger.info(
        {
          ...logBase,
          attio_person_id: personId,
          replay_triggered: true,
        },
        "SLNG webhook processed — pipeline replay started in background",
      );
    } else {
      logger.warn(
        {
          ...logBase,
          attio_person_id: personId,
          replay_triggered: false,
        },
        "SLNG webhook stored in Attio but pipeline replay was skipped",
      );
    }
  } catch (err) {
    logger.warn(
      {
        ...logBase,
        err: err instanceof Error ? err.message : String(err),
        replay_triggered: false,
      },
      "Unexpected SLNG webhook handler error",
    );
  }

  return { ok: true };
}

export async function slngWebhookRoute(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<SlngWebhookResponse> {
  const result = await handleSlngWebhook(request.body);
  return reply.send(result);
}

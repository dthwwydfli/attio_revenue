import type {
  GeneratedAction,
  LeadInput,
  PipelineResult,
} from "@leadloop/shared";
import { inferDomain, LeadInputSchema } from "@leadloop/shared";
import { env } from "./lib/env.js";
import { http } from "./lib/http.js";
import { createLogger } from "./lib/logger.js";
import {
  assertCompany,
  assertPerson,
  createNote,
  createTask,
  fetchPersonContext,
  updateCompanyAttributes,
  updatePersonAttributes,
} from "./services/attio.js";
import { enrichLead } from "./services/enrich.js";
import { generateAction } from "./services/llm.js";
import { scoreLead } from "./services/scoring.js";
import { dispatchVoiceTouchpoint } from "./services/slng.js";

const logger = createLogger("pipeline");

interface N8nPipelinePayload {
  personId: string;
  band: string;
  score: number;
  shouldCallVoice: boolean;
  taskCreated: boolean;
  emailDraftSaved: boolean;
}

function buildLeadInputFromContext(
  context: NonNullable<Awaited<ReturnType<typeof fetchPersonContext>>>,
): LeadInput | null {
  if (!context.email) return null;

  const candidate: LeadInput = {
    name: context.name,
    email: context.email,
    company: context.companyName ?? "Unknown Company",
    role: context.role,
    phone: context.phone,
    message: context.message,
    source: context.source ?? "attio",
    domain: inferDomain(context.email, context.companyName ?? "Unknown Company"),
  };

  const parsed = LeadInputSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function buildAgentSummaryNote(
  action: GeneratedAction,
  scoring: { band: string; score: number },
  enrichment: { description: string | null },
): string {
  return [
    `**Subject:** ${action.replySubject}`,
    "",
    action.replyBody,
    "",
    `**Rationale:** ${action.rationale}`,
    "",
    `**Score:** ${scoring.band} (${scoring.score}/100)`,
    "",
    "### Enrichment",
    enrichment.description ?? "No enrichment summary available.",
  ].join("\n");
}

async function writeAttioResults(
  personId: string,
  companyId: string | undefined,
  lead: LeadInput,
  action: GeneratedAction,
  scoring: { band: string; score: number },
  enrichment: {
    description: string | null;
    employee_band: string | null;
    industry: string | null;
  },
): Promise<{ noteId: string | null; taskId: string | null; emailDraftSaved: boolean }> {
  let noteId: string | null = null;
  let taskId: string | null = null;
  let emailDraftSaved = false;

  try {
    const { noteId: summaryNoteId } = await createNote(
      personId,
      buildAgentSummaryNote(action, scoring, enrichment),
      "LeadLoop Agent Summary",
    );
    noteId = summaryNoteId;
  } catch (err) {
    logger.warn(
      {
        personId,
        err: err instanceof Error ? err.message : String(err),
      },
      "Attio agent summary note failed",
    );
  }

  if (action.taskTitle && action.taskBody) {
    try {
      const task = await createTask(personId, action.taskTitle, action.taskBody);
      taskId = task.taskId;
    } catch (err) {
      logger.warn(
        {
          personId,
          err: err instanceof Error ? err.message : String(err),
        },
        "Attio task creation failed",
      );
    }
  }

  try {
    await createNote(
      personId,
      `Email Draft:\n\nSubject: ${action.replySubject}\n\nBody:\n${action.replyBody}`,
      "Email Draft",
    );
    emailDraftSaved = true;
  } catch (err) {
    logger.warn(
      {
        personId,
        err: err instanceof Error ? err.message : String(err),
      },
      "Attio email draft note failed",
    );
  }

  try {
    await updatePersonAttributes(personId, {
      lead_score: scoring.score,
      lead_band: scoring.band,
      routing_status: "completed",
      agent_summary: action.rationale.slice(0, 500),
      source: lead.source,
      last_agent_run_at: new Date().toISOString(),
    });

    if (companyId) {
      await updateCompanyAttributes(companyId, {
        enrichment_summary: enrichment.description?.slice(0, 500) ?? "",
        employee_band: enrichment.employee_band ?? "",
        industry_tag: enrichment.industry ?? "",
      });
    }
  } catch (err) {
    logger.warn(
      {
        personId,
        err: err instanceof Error ? err.message : String(err),
      },
      "Attio attribute writeback failed",
    );
  }

  return { noteId, taskId, emailDraftSaved };
}

async function postN8nWebhook(payload: N8nPipelinePayload): Promise<void> {
  if (!env.n8nWebhookUrl) return;

  await http(env.n8nWebhookUrl, {
    method: "POST",
    body: payload,
    timeoutMs: 10_000,
    retries: 1,
    logger,
  });
}

/** Layer 6 — orchestrates Layers 1–5 for a single Attio person. Never throws. */
export async function runPipeline(personId: string): Promise<PipelineResult> {
  logger.info({ event: "pipeline_start", personId });

  try {
    const context = await fetchPersonContext(personId);
    if (!context) {
      logger.info({ event: "pipeline_end", personId, ok: false, reason: "lead_not_found" });
      return { ok: false, reason: "lead_not_found" };
    }

    const lead = buildLeadInputFromContext(context);
    if (!lead) {
      logger.info({ event: "pipeline_end", personId, ok: false, reason: "lead_not_found" });
      return { ok: false, reason: "lead_not_found" };
    }

    const domain = inferDomain(lead.email, lead.company, lead.domain);
    const enrichment = await enrichLead(lead.company, domain);
    const scoring = await scoreLead(enrichment);

    let action: GeneratedAction;
    try {
      action = await generateAction(lead, enrichment, scoring);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ personId, err: message }, "LLM action generation failed");
      logger.info({ event: "pipeline_end", personId, ok: false, reason: "pipeline_error" });
      return { ok: false, reason: "pipeline_error", error: message };
    }

    logger.info({
      personId,
      scoring_band: scoring.band,
      llm_source: action.source,
    });

    if (action.shouldCallVoice) {
      void dispatchVoiceTouchpoint(lead, action).catch((err) => {
        logger.warn(
          {
            personId,
            err: err instanceof Error ? err.message : String(err),
          },
          "SLNG voice dispatch failed",
        );
      });
    }

    const attioWrite = await writeAttioResults(
      personId,
      context.companyId,
      lead,
      action,
      scoring,
      enrichment,
    );

    logger.info({
      personId,
      attio_note_id: attioWrite.noteId,
      attio_task_id: attioWrite.taskId,
    });

    const n8nTriggered = Boolean(env.n8nWebhookUrl);
    if (n8nTriggered) {
      void postN8nWebhook({
        personId,
        band: scoring.band,
        score: scoring.score,
        shouldCallVoice: action.shouldCallVoice,
        taskCreated: Boolean(attioWrite.taskId),
        emailDraftSaved: attioWrite.emailDraftSaved,
      }).catch((err) => {
        logger.warn(
          {
            personId,
            err: err instanceof Error ? err.message : String(err),
          },
          "n8n webhook failed",
        );
      });
    }

    logger.info({
      event: "pipeline_end",
      personId,
      ok: true,
      n8nTriggered,
    });

    return {
      ok: true,
      lead,
      enrichment,
      scoring,
      action,
      attio: {
        noteId: attioWrite.noteId,
        taskId: attioWrite.taskId,
      },
      n8nTriggered,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ event: "pipeline_end", personId, ok: false, error: message }, "pipeline_error");
    return { ok: false, reason: "pipeline_error", error: message };
  }
}

/** Upserts a demo/inbound lead in Attio, then runs the full pipeline by person ID. */
export async function processDemoLead(input: LeadInput): Promise<PipelineResult> {
  try {
    const domain = inferDomain(input.email, input.company, input.domain);
    const { companyId } = await assertCompany(domain, input.company);
    const { personId } = await assertPerson(input.email, input.name, companyId);
    return await runPipeline(personId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ err: message }, "processDemoLead failed");
    return { ok: false, reason: "pipeline_error", error: message };
  }
}

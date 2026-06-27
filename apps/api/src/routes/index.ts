import type { FastifyInstance } from "fastify";
import {
  LeadInputSchema,
  DemoScenarioSchema,
  DEMO_LEADS,
  type LeadStatusResponse,
} from "@leadloop/shared";
import { env } from "../lib/env.js";
import { getRun, listRuns } from "../store.js";
import { processLead } from "../pipeline.js";
import { approveLead, ApprovalError } from "../services/approve.js";
import { handleSlngWebhook, validateSlngWebhookSecret } from "../services/slng.js";
import { appendEvent, updateRun } from "../store.js";
import { createNote } from "../services/attio.js";
import type { HealthResponse } from "../types/global.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    uptime: process.uptime(),
    attio: Boolean(env.attioApiKey),
    tavily: Boolean(env.tavilyApiKey),
    gemini: Boolean(env.geminiApiKey),
    slng: Boolean(env.slngApiKey && env.slngAgentId),
    sie: env.sieEndpoint,
  }));

  app.get("/icp", async () => ({
    description: env.icpDescription,
  }));

  app.post("/leads/process", async (request, reply) => {
    const parsed = LeadInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    const result = await processLead(parsed.data);
    return result;
  });

  app.get<{ Params: { id: string } }>("/leads/:id", async (request, reply) => {
    const run = getRun(request.params.id);
    if (!run) return reply.status(404).send({ error: "Lead run not found" });
    return run;
  });

  app.get<{ Params: { id: string } }>("/leads/:id/status", async (request, reply) => {
    const run = getRun(request.params.id);
    if (!run) return reply.status(404).send({ error: "Lead run not found" });

    const status: LeadStatusResponse = {
      id: run.id,
      status: run.status,
      currentStep: run.currentStep,
      events: run.events,
      score: run.score,
      slng: run.slng,
      attio: run.attio,
      error: run.error,
      humanApproved: run.humanApproved,
      approvedAt: run.approvedAt,
    };
    return status;
  });

  app.post<{ Params: { id: string } }>("/leads/:id/approve", async (request, reply) => {
    const run = getRun(request.params.id);
    if (!run) return reply.status(404).send({ error: "Lead run not found" });

    try {
      const result = await approveLead(run);
      return result;
    } catch (err) {
      if (err instanceof ApprovalError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  app.get("/leads", async () => listRuns());

  app.post<{ Params: { scenario: string } }>(
    "/demo/replay/:scenario",
    async (request, reply) => {
      const parsed = DemoScenarioSchema.safeParse(request.params.scenario);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid scenario. Use hot, warm, or cold." });
      }
      const lead = DEMO_LEADS[parsed.data];
      const result = await processLead(lead);
      return { ...result, scenario: parsed.data };
    },
  );

  app.post("/webhooks/slng", async (request, reply) => {
    const headerSecret = request.headers["x-slng-webhook-secret"];
    const secret =
      typeof headerSecret === "string"
        ? headerSecret
        : Array.isArray(headerSecret)
          ? headerSecret[0]
          : undefined;

    if (!validateSlngWebhookSecret(secret)) {
      return reply.status(401).send({ error: "Invalid SLNG webhook secret" });
    }

    const payload = request.body as {
      call_id?: string;
      summary?: string;
      transcript?: string;
      lead_run_id?: string;
      metadata?: { lead_run_id?: string };
    };

    const leadRunId = payload.lead_run_id ?? payload.metadata?.lead_run_id;
    const result = handleSlngWebhook(payload);

    if (leadRunId) {
      const run = getRun(leadRunId);
      if (run?.attio?.personRecordId && result.transcriptSnippet) {
        await createNote(
          run.attio.personRecordId,
          `## SLNG Voice Callback\n\n${result.transcriptSnippet}`,
        ).catch(() => undefined);
      }
      updateRun(leadRunId, {
        slng: {
          status: result.status,
          callId: result.callId,
          transcriptSnippet: result.transcriptSnippet,
        },
      });
      appendEvent(leadRunId, {
        step: "voice",
        status: "completed",
        message: "SLNG webhook received",
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true, ...result };
  });
}

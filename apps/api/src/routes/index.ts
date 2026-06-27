import type { FastifyInstance } from "fastify";
import {
  LeadInputSchema,
  DemoScenarioSchema,
  DEMO_LEADS,
  type LeadStatusResponse,
} from "@leadloop/shared";
import { env } from "../config.js";
import { getRun, listRuns } from "../store.js";
import { processLead } from "../pipeline.js";
import { handleSlngWebhook } from "../services/slng.js";
import { appendEvent, updateRun } from "../store.js";
import { createNote } from "../services/attio.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => ({
    ok: true,
    attio: Boolean(env.attioApiKey),
    tavily: Boolean(env.tavilyApiKey),
    openai: Boolean(env.openaiApiKey),
    slng: Boolean(env.slngApiKey && env.slngAgentId),
    sie: env.sieBaseUrl,
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
    };
    return status;
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
    const payload = request.body as {
      call_id?: string;
      summary?: string;
      transcript?: string;
      lead_run_id?: string;
    };

    const result = handleSlngWebhook(payload);

    if (payload.lead_run_id) {
      const run = getRun(payload.lead_run_id);
      if (run?.attio?.personRecordId && result.transcriptSnippet) {
        await createNote(
          "people",
          run.attio.personRecordId,
          "SLNG Voice Callback",
          result.transcriptSnippet,
        ).catch(() => undefined);
      }
      updateRun(payload.lead_run_id, {
        slng: {
          status: result.status,
          callId: result.callId,
          transcriptSnippet: result.transcriptSnippet,
        },
      });
      appendEvent(payload.lead_run_id, {
        step: "voice",
        status: "completed",
        message: "SLNG webhook received",
        timestamp: new Date().toISOString(),
      });
    }

    return { ok: true, ...result };
  });
}

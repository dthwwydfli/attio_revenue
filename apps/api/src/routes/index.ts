import type { FastifyInstance } from "fastify";
import { DemoScenarioSchema, DEMO_LEADS, type LeadStatusResponse } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { isSlngApiKeyConfigured, resolveSlngAgentId } from "../lib/slng-client.js";
import { processDemoLead } from "../pipeline.js";
import { getRun, listRuns } from "../store.js";
import type { HealthResponse } from "../types/global.js";
import { processLeadRoute } from "./leads/process.js";
import { slngWebhookRoute } from "./webhooks/slng.js";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (): Promise<HealthResponse> => {
    const slngAgent = isSlngApiKeyConfigured() ? Boolean(await resolveSlngAgentId()) : false;
    return {
      ok: true,
      uptime: process.uptime(),
      attio: Boolean(env.attioApiKey),
      tavily: Boolean(env.tavilyApiKey),
      openai: Boolean(env.openaiApiKey),
      slng: isSlngApiKeyConfigured(),
      slngAgent,
      sie: env.sieEndpoint,
    };
  });

  app.get("/icp", async () => ({
    description: env.icpDescription,
  }));

  app.post("/leads/process", processLeadRoute);
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

  app.post("/webhooks/slng", slngWebhookRoute);

  app.post<{ Params: { scenario: string } }>(
    "/demo/replay/:scenario",
    async (request, reply) => {
      const parsed = DemoScenarioSchema.safeParse(request.params.scenario);
      if (!parsed.success) {
        return reply.status(400).send({ error: "Invalid scenario. Use hot, warm, or cold." });
      }
      const lead = DEMO_LEADS[parsed.data];
      const result = await processDemoLead(lead);
      return { ...result, scenario: parsed.data };
    },
  );
}

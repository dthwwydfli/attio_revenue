import type { FastifyInstance } from "fastify";
import type { HealthResponse, NotImplementedResponse } from "../types/global.js";

function notImplemented(layer: string, message: string): NotImplementedResponse {
  return {
    error: "not_implemented",
    layer,
    message,
  };
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (): Promise<HealthResponse> => ({
    ok: true,
    uptime: process.uptime(),
  }));

  app.post("/leads/process", async (_request, reply) => {
    return reply.status(501).send(
      notImplemented("pipeline", "Lead processing pipeline is not wired yet"),
    );
  });

  app.get<{ Params: { id: string } }>("/leads/:id/status", async (request, reply) => {
    return reply.status(501).send(
      notImplemented(
        "pipeline",
        `Lead status polling is not wired yet (id: ${request.params.id})`,
      ),
    );
  });

  app.post("/webhooks/slng", async (_request, reply) => {
    return reply.status(501).send(
      notImplemented("slng", "SLNG webhook handler is not wired yet"),
    );
  });

  app.post<{ Params: { scenario: string } }>(
    "/demo/replay/:scenario",
    async (request, reply) => {
      return reply.status(501).send(
        notImplemented(
          "pipeline",
          `Demo replay is not wired yet (scenario: ${request.params.scenario})`,
        ),
      );
    },
  );
}

import type { FastifyReply, FastifyRequest } from "fastify";
import { ProcessLeadByPersonSchema } from "@leadloop/shared";
import { runPipeline } from "../../pipeline.js";

export async function processLeadRoute(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const parsed = ProcessLeadByPersonSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.flatten() });
  }

  const result = await runPipeline(parsed.data.personId);
  return reply.send(result);
}

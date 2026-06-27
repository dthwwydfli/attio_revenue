import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config.js";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.corsOrigin,
  methods: ["GET", "POST", "OPTIONS"],
});

await registerRoutes(app);

try {
  await app.listen({ port: env.port, host: "0.0.0.0" });
  console.log(`LeadLoop API listening on http://localhost:${env.port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./lib/env.js";
import { loggerOptions, rootLogger } from "./lib/logger.js";
import { registerRoutes } from "./routes/index.js";

const app = Fastify({
  logger: loggerOptions,
});

await app.register(cors, {
  origin: env.corsOrigin,
  methods: ["GET", "POST", "OPTIONS"],
});

await registerRoutes(app);

const shutdown = async (signal: string): Promise<void> => {
  rootLogger.info({ signal }, "Shutting down gracefully");
  try {
    await app.close();
    rootLogger.info("Server closed");
    process.exit(0);
  } catch (err) {
    rootLogger.error({ err }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ port: env.port, host: "0.0.0.0" });
  rootLogger.info({ port: env.port, corsOrigin: env.corsOrigin }, "LeadLoop API listening");
} catch (err) {
  rootLogger.error({ err }, "Failed to start server");
  process.exit(1);
}

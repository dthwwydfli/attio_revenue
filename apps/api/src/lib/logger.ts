import pino, { type Logger, type LoggerOptions } from "pino";
import { env } from "./env.js";

const isDev = env.nodeEnv !== "production";

export const loggerOptions: LoggerOptions = isDev
  ? {
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    }
  : {
      level: "info",
    };

export const rootLogger: Logger = pino(loggerOptions);

export function createLogger(module: string): Logger {
  return rootLogger.child({ module });
}

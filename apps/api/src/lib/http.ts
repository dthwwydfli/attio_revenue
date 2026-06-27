import type { Logger } from "pino";
import { createLogger } from "./logger.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 3;
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const USER_AGENT = "LeadLoop/1.0";

const httpLogger = createLogger("http");

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly body: string,
  ) {
    super(`HTTP ${status} for ${url}: ${body.slice(0, 300)}`);
    this.name = "HttpError";
  }
}

export interface HttpOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  logger?: Logger;
  parseJson?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mergeHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  if (!headers.has("User-Agent")) {
    headers.set("User-Agent", USER_AGENT);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  return headers;
}

export async function http<T = unknown>(url: string, options: HttpOptions = {}): Promise<T> {
  const {
    body,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    logger = httpLogger,
    parseJson = true,
    headers: initHeaders,
    ...init
  } = options;

  const headers = mergeHeaders(initHeaders);
  let requestBody: string | undefined;

  if (body !== undefined) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    requestBody = typeof body === "string" ? body : JSON.stringify(body);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      logger.debug({ url, method: init.method ?? "GET", attempt }, "HTTP request");

      const response = await fetch(url, {
        ...init,
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      const text = await response.text();

      if (!response.ok) {
        if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
          const delayMs = Math.min(1000 * 2 ** attempt, 8000);
          logger.warn(
            { url, status: response.status, attempt, delayMs },
            "Retrying HTTP request",
          );
          await sleep(delayMs);
          continue;
        }

        logger.error({ url, status: response.status, body: text.slice(0, 500) }, "HTTP error");
        throw new HttpError(response.status, url, text);
      }

      logger.debug({ url, status: response.status, attempt }, "HTTP response");

      if (!parseJson || text.length === 0) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (err) {
      lastError = err;

      const isAbort = err instanceof Error && err.name === "AbortError";
      const isRetryable = isAbort || (err instanceof HttpError && RETRYABLE_STATUSES.has(err.status));

      if (isRetryable && attempt < retries) {
        const delayMs = Math.min(1000 * 2 ** attempt, 8000);
        logger.warn({ url, attempt, delayMs, err: String(err) }, "Retrying HTTP request after failure");
        await sleep(delayMs);
        continue;
      }

      if (!(err instanceof HttpError)) {
        logger.error({ url, err: String(err) }, "HTTP request failed");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("HTTP request failed");
}

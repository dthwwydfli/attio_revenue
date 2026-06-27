import type { LeadRun } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("n8n");

export function isN8nConfigured(): boolean {
  return Boolean(env.n8nWebhookUrl) && !env.n8nWebhookUrl.includes("placeholder");
}

export type N8nPipelinePayload = {
  event: "pipeline_completed" | "pipeline_failed";
  leadRunId: string;
  status: LeadRun["status"];
  band?: string;
  score?: number;
  lead: {
    name: string;
    email: string;
    company: string;
    role?: string;
    source: string;
  };
  attioPersonUrl?: string;
  slngStatus?: string;
  humanApproved?: boolean;
  error?: string;
  timestamp: string;
};

export function buildN8nPipelinePayload(run: LeadRun): N8nPipelinePayload {
  return {
    event: run.status === "failed" ? "pipeline_failed" : "pipeline_completed",
    leadRunId: run.id,
    status: run.status,
    band: run.score?.band,
    score: run.score?.score,
    lead: {
      name: run.input.name,
      email: run.input.email,
      company: run.input.company,
      role: run.input.role,
      source: run.input.source,
    },
    attioPersonUrl: run.attio?.personUrl,
    slngStatus: run.slng?.status,
    humanApproved: "humanApproved" in run ? (run as { humanApproved?: boolean }).humanApproved : undefined,
    error: run.error,
    timestamp: new Date().toISOString(),
  };
}

/** Fire-and-forget — never throws to the pipeline caller. */
export function notifyN8nPipeline(run: LeadRun): void {
  if (!isN8nConfigured()) return;

  const payload = buildN8nPipelinePayload(run);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (env.n8nWebhookSecret) {
    headers["x-n8n-webhook-secret"] = env.n8nWebhookSecret;
  }

  void fetch(env.n8nWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text();
        logger.warn(
          { status: res.status, body: text.slice(0, 200), leadRunId: run.id },
          "n8n webhook returned non-OK status",
        );
        return;
      }
      logger.info({ leadRunId: run.id, event: payload.event }, "n8n pipeline notification sent");
    })
    .catch((err) => {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err), leadRunId: run.id },
        "n8n webhook request failed",
      );
    });
}

export async function testN8nWebhook(): Promise<{ ok: boolean; status: number; detail: string }> {
  if (!isN8nConfigured()) {
    return { ok: false, status: 0, detail: "N8N_WEBHOOK_URL not set in .env.local" };
  }

  const probe: N8nPipelinePayload = {
    event: "pipeline_completed",
    leadRunId: `n8n-test-${Date.now()}`,
    status: "completed",
    band: "hot",
    score: 92,
    lead: {
      name: "n8n Connectivity Test",
      email: "n8n-test@leadloop.dev",
      company: "LeadLoop",
      role: "Test",
      source: "n8n_test",
    },
    timestamp: new Date().toISOString(),
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (env.n8nWebhookSecret) {
    headers["x-n8n-webhook-secret"] = env.n8nWebhookSecret;
  }

  const res = await fetch(env.n8nWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(probe),
  });
  const text = await res.text();

  if (res.ok) {
    return { ok: true, status: res.status, detail: text.slice(0, 200) || "OK" };
  }

  return {
    ok: false,
    status: res.status,
    detail:
      res.status === 404
        ? "Webhook not found — import workflows/pipeline-callback.json in n8n and activate it"
        : text.slice(0, 200),
  };
}

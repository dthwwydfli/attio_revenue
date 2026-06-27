import type { EnrichmentResult, LeadInput, GeneratedAction, SlngResult } from "@leadloop/shared";
import { env } from "../config.js";
import { createLogger } from "../lib/logger.js";
import { ensureSlngAgentIcpPrompt } from "../lib/slng-client.js";
import type { LLMCallScriptResult } from "./llm.js";

const logger = createLogger("slng");

export interface SlngVoiceContext {
  leadRunId: string;
  callScript?: LLMCallScriptResult;
  enrichment?: EnrichmentResult;
}

export function isSlngConfigured(): boolean {
  return Boolean(
    env.slngApiKey &&
      env.slngAgentId &&
      !env.slngApiKey.includes("placeholder") &&
      !env.slngAgentId.includes("placeholder"),
  );
}

function buildSlngArguments(
  input: LeadInput,
  action: GeneratedAction,
  ctx: SlngVoiceContext,
): Record<string, string> {
  const parts: string[] = [
    `LeadLoop ICP: ${env.icpDescription}`,
    "Qualify this lead against the ICP and steer toward agentic CRM automation with Attio.",
  ];

  if (input.role) {
    parts.push(`Lead title: ${input.role}`);
  }

  if (ctx.callScript) {
    parts.push(ctx.callScript.opening, ctx.callScript.pitch, ctx.callScript.close);
  } else {
    parts.push(action.rationale);
  }

  if (ctx.enrichment?.employee_band) {
    parts.push(`Company size: ${ctx.enrichment.employee_band}`);
  }
  if (ctx.enrichment?.industry) {
    parts.push(`Industry: ${ctx.enrichment.industry}`);
  }
  if (ctx.enrichment?.description) {
    parts.push(`Company: ${ctx.enrichment.description}`);
  }
  if (input.message) {
    parts.push(`Inbound note: ${input.message.slice(0, 200)}`);
  }

  const pitchContext = parts.filter(Boolean).join(". ").slice(0, 900);

  // Agent template only accepts lead_name, company_name, pitch_context (see slng-leadloop-agent.json).
  return {
    lead_name: input.name.split(" ")[0] ?? input.name,
    company_name: input.company,
    pitch_context: pitchContext,
  };
}

function slngMetadata(ctx: SlngVoiceContext): { lead_run_id: string } {
  return { lead_run_id: ctx.leadRunId };
}

export async function dispatchVoiceTouchpoint(
  input: LeadInput,
  action: GeneratedAction,
  ctx: SlngVoiceContext,
): Promise<SlngResult> {
  if (!action.shouldCallVoice) {
    return { status: "skipped" };
  }

  if (isSlngConfigured()) {
    try {
      return await dispatchSlngWebSession(input, action, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ err: message, leadRunId: ctx.leadRunId }, "SLNG web session failed");
      return {
        status: "failed",
        transcriptSnippet: message,
      };
    }
  }

  return mockSlngSession(input, ctx.leadRunId);
}

function formatSlngError(status: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: string; message?: string };
    const detail = parsed.detail ?? parsed.message ?? body;
    if (status === 402 || detail.toLowerCase().includes("credit")) {
      return "SLNG voice is unavailable — insufficient credits on your SLNG account. Top up at slng.ai and retry.";
    }
    if (status === 401 || status === 403) {
      return "SLNG authentication failed — check SLNG_API_KEY and SLNG_AGENT_ID in .env.local.";
    }
    return `SLNG voice session failed (${status}): ${detail.slice(0, 200)}`;
  } catch {
    return `SLNG voice session failed (${status}): ${body.slice(0, 200)}`;
  }
}

async function dispatchSlngWebSession(
  input: LeadInput,
  action: GeneratedAction,
  ctx: SlngVoiceContext,
): Promise<SlngResult> {
  const res = await fetch(
    `https://api.agents.slng.ai/v1/agents/${env.slngAgentId}/web-sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.slngApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        arguments: buildSlngArguments(input, action, ctx),
        participant_name: input.name,
        metadata: slngMetadata(ctx),
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(formatSlngError(res.status, text));
  }

  const json = (await res.json()) as {
    call_id?: string;
    livekit_url?: string;
    livekit_token?: string;
    room_name?: string;
    livekit?: { url?: string; token?: string };
  };

  const livekitUrl = json.livekit_url ?? json.livekit?.url;
  const livekitToken = json.livekit_token ?? json.livekit?.token;

  if (!livekitUrl || !livekitToken) {
    throw new Error(
      `SLNG web session missing LiveKit credentials (url=${Boolean(livekitUrl)}, token=${Boolean(livekitToken)})`,
    );
  }

  return {
    status: "web_session_started",
    callId: json.call_id,
    livekitUrl,
    livekitToken,
    transcriptSnippet: `Voice agent session started for ${input.name} at ${input.company}.`,
  };
}

async function dispatchSlngCall(
  input: LeadInput,
  action: GeneratedAction,
  ctx: SlngVoiceContext,
): Promise<SlngResult> {
  if (!input.phone) {
    return { status: "skipped" };
  }

  const res = await fetch(
    `https://api.agents.slng.ai/v1/agents/${env.slngAgentId}/calls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.slngApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: input.phone,
        arguments: buildSlngArguments(input, action, ctx),
        metadata: slngMetadata(ctx),
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`SLNG call failed: ${res.status}`);
  }

  const json = (await res.json()) as { call_id?: string };
  return {
    status: "web_session_started",
    callId: json.call_id,
    transcriptSnippet: `Outbound call initiated to ${input.phone}.`,
  };
}

function mockSlngSession(input: LeadInput, leadRunId: string): SlngResult {
  return {
    status: "web_session_started",
    callId: `mock-${leadRunId}`,
    transcriptSnippet: `[Demo mode] SLNG voice agent would engage ${input.name} at ${input.company} with personalized pitch. Add SLNG_API_KEY and SLNG_AGENT_ID for a live session.`,
  };
}

export function handleSlngWebhook(payload: {
  call_id?: string;
  summary?: string;
  transcript?: string;
}): { callId?: string; transcriptSnippet?: string; status: "call_completed" | "failed" } {
  const snippet = payload.summary ?? payload.transcript?.slice(0, 300);
  if (!snippet) {
    return { status: "failed", callId: payload.call_id };
  }
  return {
    status: "call_completed",
    callId: payload.call_id,
    transcriptSnippet: snippet,
  };
}

export function validateSlngWebhookSecret(headerSecret: string | undefined): boolean {
  if (!env.slngWebhookSecret) return true;
  return headerSecret === env.slngWebhookSecret;
}

export async function startVoiceSessionForLead(run: {
  id: string;
  input: LeadInput;
  action?: GeneratedAction;
  enrichment?: EnrichmentResult;
}): Promise<SlngResult> {
  if (!run.action) {
    throw new Error("Lead has no generated action for voice session");
  }
  if (!isSlngConfigured()) {
    throw new Error("SLNG is not configured");
  }
  await ensureSlngAgentIcpPrompt().catch(() => undefined);
  return dispatchSlngWebSession(run.input, run.action, {
    leadRunId: run.id,
    enrichment: run.enrichment,
  });
}

export { dispatchSlngCall };

import type { LeadInput, GeneratedAction, SlngResult } from "@leadloop/shared";
import { env } from "../config.js";
import type { LLMCallScriptResult } from "./llm.js";

export interface SlngVoiceContext {
  leadRunId: string;
  callScript?: LLMCallScriptResult;
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
): Record<string, string | string[]> {
  const args: Record<string, string | string[]> = {
    lead_name: input.name.split(" ")[0] ?? input.name,
    company_name: input.company,
    pitch_context: action.rationale.slice(0, 200),
    lead_run_id: ctx.leadRunId,
  };

  if (ctx.callScript) {
    args.opening = ctx.callScript.opening;
    args.pitch = ctx.callScript.pitch;
    args.close = ctx.callScript.close;
    args.objection_handlers = ctx.callScript.objectionHandlers;
  }

  return args;
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
    } catch {
      return mockSlngSession(input, ctx.leadRunId);
    }
  }

  return mockSlngSession(input, ctx.leadRunId);
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
    throw new Error(`SLNG web session failed: ${res.status} ${text}`);
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

export { dispatchSlngCall };

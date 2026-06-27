import type { LeadInput, GeneratedAction, SlngResult } from "@leadloop/shared";
import { env } from "../config.js";
import {
  isSlngApiKeyConfigured,
  resolveSlngAgentId,
  startSlngWebSession,
} from "../lib/slng-client.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("slng");

export async function dispatchVoiceTouchpoint(
  input: LeadInput,
  action: GeneratedAction,
): Promise<SlngResult> {
  if (!action.shouldCallVoice || scoreBandRequiresVoice(input) === false) {
    return { status: "skipped" };
  }

  if (isSlngApiKeyConfigured()) {
    try {
      const agentId = await resolveSlngAgentId();
      if (!agentId) {
        logger.warn("SLNG API key set but no voice agent found — using demo mock");
        return mockSlngSession(input);
      }
      return await dispatchSlngWebSession(agentId, input, action);
    } catch (err) {
      logger.warn(
        { err: err instanceof Error ? err.message : String(err) },
        "SLNG dispatch failed — using demo mock",
      );
      return mockSlngSession(input);
    }
  }

  return mockSlngSession(input);
}

function scoreBandRequiresVoice(_input: LeadInput): boolean {
  return true;
}

async function dispatchSlngWebSession(
  agentId: string,
  input: LeadInput,
  action: GeneratedAction,
): Promise<SlngResult> {
  const session = await startSlngWebSession(agentId, {
    name: input.name,
    company: input.company,
    pitchContext: action.rationale.slice(0, 200),
  });

  return {
    status: "web_session_started",
    callId: session.callId,
    roomUrl: session.roomUrl,
    transcriptSnippet: `Voice agent session started for ${input.name} at ${input.company}.`,
  };
}

async function dispatchSlngCall(input: LeadInput, action: GeneratedAction): Promise<SlngResult> {
  if (!input.phone) {
    return { status: "skipped" };
  }

  const agentId = await resolveSlngAgentId();
  if (!agentId) {
    throw new Error("No SLNG agent available for outbound call");
  }

  const res = await fetch(
    `https://api.agents.slng.ai/v1/agents/${agentId}/calls`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.slngApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone_number: input.phone,
        arguments: {
          lead_name: input.name.split(" ")[0],
          company_name: input.company,
          pitch_context: action.rationale.slice(0, 200),
        },
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

function mockSlngSession(input: LeadInput): SlngResult {
  return {
    status: "web_session_started",
    callId: `mock-${Date.now()}`,
    transcriptSnippet: `[Demo mode] SLNG voice agent would engage ${input.name} at ${input.company} with personalized pitch.`,
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

export { dispatchSlngCall };

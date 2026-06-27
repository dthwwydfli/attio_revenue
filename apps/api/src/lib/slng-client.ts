import { env } from "./env.js";
import { createLogger } from "./logger.js";

const logger = createLogger("slng");
const AGENTS_BASE = "https://api.agents.slng.ai/v1";
const GATEWAY_BASE = "https://api.slng.ai/v1";

export const LEADLOOP_SLNG_AGENT = {
  name: "LeadLoop Inbound SDR",
  system_prompt:
    "You are a concise inbound SDR for LeadLoop, an autonomous lead router for Attio CRM. " +
    "Your ideal customer profile (ICP): B2B SaaS companies, 50-500 employees, US/EU, buying intent for CRM automation, " +
    "VP Sales or RevOps leaders evaluating agentic CRM tools. " +
    "In every reply, relate the conversation to this ICP — confirm company size, region, CRM automation buying intent, " +
    "and whether they are a VP Sales or RevOps leader. Ask about timeline and interest in autonomous inbound routing with Attio. " +
    "Keep replies to one or two sentences.",
  greeting:
    "Hi {{lead_name}}, thanks for reaching out about LeadLoop for {{company_name}}. " +
    "We help RevOps and sales leaders automate inbound CRM routing — quick question on your team size and timeline?",
  language: "en",
  template_defaults: {
    lead_name: "there",
    company_name: "your company",
    pitch_context:
      "B2B SaaS, 50-500 employees, US/EU, buying intent for CRM automation, VP Sales or RevOps evaluating agentic CRM",
  },
  models: {
    stt: "slng/deepgram/nova:3-en",
    tts: "slng/rime/arcana:3-en",
    tts_voice: "astra",
  },
} as const;

const LLM_CANDIDATES = [
  "groq/openai/gpt-oss-120b",
  "bedrock-mantle/nvidia.nemotron-nano-3-30b",
  "bedrock-mantle/nvidia.nemotron-super-3-120b",
] as const;

const REGION_CANDIDATES = ["eu-central", "us-east"] as const;

let cachedAgentId: string | null | undefined;

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    Authorization: `Bearer ${env.slngApiKey}`,
    Accept: "application/json",
    ...extra,
  };
}

export function isSlngApiKeyConfigured(): boolean {
  return Boolean(env.slngApiKey) && !env.slngApiKey.includes("placeholder");
}

export function isSlngAgentConfigured(): boolean {
  return Boolean(env.slngAgentId) && !env.slngAgentId.includes("placeholder");
}

export async function testSlngGatewayTts(): Promise<boolean> {
  const res = await fetch(`${GATEWAY_BASE}/tts/slng/rime/arcana:3-en`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      text: "Hello from LeadLoop",
      speaker: "astra",
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SLNG gateway TTS failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const bytes = await res.arrayBuffer();
  return bytes.byteLength > 0;
}

async function agentsFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${AGENTS_BASE}${path}`, {
    ...init,
    headers: authHeaders(init?.headers as Record<string, string> | undefined),
  });
}

export async function listSlngAgents(): Promise<Array<{ id: string; name?: string }>> {
  const res = await agentsFetch("/agents");
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`List agents failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const parsed: unknown = JSON.parse(text);
  const items = Array.isArray(parsed) ? parsed : [];
  const agents: Array<{ id: string; name?: string }> = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    if (!id) continue;
    const name = typeof row.name === "string" ? row.name : undefined;
    agents.push({ id, name });
  }
  return agents;
}

export async function createLeadLoopSlngAgent(): Promise<string> {
  let lastError = "unknown error";

  for (const region of REGION_CANDIDATES) {
    for (const llm of LLM_CANDIDATES) {
      const res = await agentsFetch("/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...LEADLOOP_SLNG_AGENT,
          region,
          models: {
            ...LEADLOOP_SLNG_AGENT.models,
            llm,
          },
        }),
      });
      const text = await res.text();
      if (res.ok) {
        const json = JSON.parse(text) as { id?: string };
        if (json.id) {
          logger.info({ agentId: json.id, region, llm }, "Created LeadLoop SLNG agent");
          return json.id;
        }
      }
      lastError = text.slice(0, 300);
      logger.debug({ region, llm, status: res.status, body: lastError }, "Agent create attempt failed");
    }
  }

  throw new Error(`Could not create SLNG agent: ${lastError}`);
}

export async function resolveSlngAgentId(): Promise<string | null> {
  if (isSlngAgentConfigured()) return env.slngAgentId;
  if (cachedAgentId !== undefined) return cachedAgentId;
  if (!isSlngApiKeyConfigured()) {
    cachedAgentId = null;
    return null;
  }

  try {
    const agents = await listSlngAgents();
    cachedAgentId = agents[0]?.id ?? null;
    if (cachedAgentId) {
      logger.info({ agentId: cachedAgentId }, "Resolved SLNG agent from account");
    }
    return cachedAgentId;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Failed to resolve SLNG agent",
    );
    cachedAgentId = null;
    return null;
  }
}

export function buildLeadLoopVoiceSystemPrompt(icpDescription: string): string {
  return (
    "You are a concise inbound SDR for LeadLoop, an autonomous lead router for Attio CRM. " +
    `Your ideal customer profile (ICP): ${icpDescription} ` +
    "In every reply, relate the conversation to this ICP — confirm company size, region, CRM automation buying intent, " +
    "and whether they are a VP Sales or RevOps leader evaluating agentic CRM tools. " +
    "Ask about timeline and interest in autonomous inbound routing with Attio integration. " +
    "Keep replies to one or two sentences."
  );
}

let agentIcpPromptSynced = false;

/** Sync dashboard agent prompt with ICP from env (best-effort, once per process). */
export async function ensureSlngAgentIcpPrompt(): Promise<void> {
  if (agentIcpPromptSynced || !isSlngAgentConfigured()) return;

  const system_prompt = buildLeadLoopVoiceSystemPrompt(env.icpDescription);
  const greeting =
    "Hi {{lead_name}}, thanks for reaching out about LeadLoop for {{company_name}}. " +
    "We help RevOps and sales leaders automate inbound CRM routing — what's your team size and timeline?";

  const res = await agentsFetch(`/agents/${env.slngAgentId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system_prompt, greeting }),
  });

  if (res.ok) {
    agentIcpPromptSynced = true;
    logger.info("Synced SLNG agent prompt with ICP");
    return;
  }

  const text = await res.text();
  logger.warn(
    { status: res.status, body: text.slice(0, 200) },
    "Could not PATCH SLNG agent ICP prompt — using pitch_context at session time",
  );
}

export async function ensureLeadLoopSlngAgent(): Promise<string> {
  const existing = await resolveSlngAgentId();
  if (existing) return existing;
  const created = await createLeadLoopSlngAgent();
  cachedAgentId = created;
  return created;
}

export async function startSlngWebSession(
  agentId: string,
  input: { name: string; company: string; pitchContext: string },
): Promise<{ callId?: string; roomUrl?: string }> {
  const res = await agentsFetch(`/agents/${agentId}/web-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      arguments: {
        lead_name: input.name.split(" ")[0],
        company_name: input.company,
        pitch_context: input.pitchContext,
      },
      participant_name: input.name,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Web session failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = JSON.parse(text) as {
    call_id?: string;
    livekit?: { url?: string };
    livekit_url?: string;
  };
  return {
    callId: json.call_id,
    roomUrl: json.livekit?.url ?? json.livekit_url,
  };
}

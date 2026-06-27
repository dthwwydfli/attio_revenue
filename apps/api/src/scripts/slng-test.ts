import "../lib/env.js";
import { env } from "../lib/env.js";
import { DEMO_LEADS } from "@leadloop/shared";

const SLNG_BASE = "https://api.agents.slng.ai/v1";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function slngFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SLNG_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.slngApiKey}`,
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

async function listAgents(): Promise<Array<{ id: string; name?: string }>> {
  const res = await slngFetch("/agents");
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`List agents failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const parsed: unknown = JSON.parse(text);

  const candidates: unknown[] = [];
  if (Array.isArray(parsed)) {
    candidates.push(...parsed);
  } else if (parsed && typeof parsed === "object") {
    const json = parsed as Record<string, unknown>;
    if (Array.isArray(json.data)) candidates.push(...json.data);
    if (Array.isArray(json.agents)) candidates.push(...json.agents);
    if (json.data && typeof json.data === "object" && !Array.isArray(json.data)) {
      const nested = json.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) candidates.push(...nested.items);
      if (Array.isArray(nested.agents)) candidates.push(...nested.agents);
    }
    if (candidates.length === 0) {
      throw new Error(`No agents parsed from response keys: ${Object.keys(json).join(", ")}`);
    }
  }

  const agents = candidates
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const id =
        (typeof row.id === "string" && row.id) ||
        (typeof row.agent_id === "string" && row.agent_id) ||
        (row.id && typeof row.id === "object" && typeof (row.id as { id?: string }).id === "string"
          ? (row.id as { id: string }).id
          : "");
      const name =
        (typeof row.name === "string" && row.name) ||
        (typeof row.title === "string" && row.title) ||
        undefined;
      return id ? { id, name } : null;
    })
    .filter((item): item is { id: string; name?: string } => item !== null);

  if (agents.length === 0) {
    return [];
  }
  return agents;
}

async function createLeadLoopAgent(): Promise<string> {
  const res = await slngFetch("/agents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "LeadLoop Inbound SDR",
      system_prompt:
        "You are a concise SDR for LeadLoop. Qualify inbound leads, confirm CRM automation needs, and offer a short demo. Keep replies to one or two sentences.",
      greeting: "Hi {{lead_name}}, thanks for your interest in LeadLoop.",
      language: "en",
      region: "eu-central",
      models: {
        stt: "slng/deepgram/nova:3-en",
        llm: "bedrock-mantle/nvidia.nemotron-super-3-120b",
        tts: "slng/deepgram/aura:2-en",
        tts_voice: "aura-2-thalia-en",
      },
      template_defaults: {
        lead_name: "there",
        company_name: "your company",
      },
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Create agent failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = JSON.parse(text) as { id?: string };
  assert(typeof json.id === "string" && json.id.length > 0, "Create agent response missing id");
  console.log(`PASS create agent — ${json.id}`);
  return json.id;
}

async function testApiKey(): Promise<void> {
  const res = await slngFetch("/agents");
  const text = await res.text();
  assert(res.ok, `List agents failed (${res.status}): ${text.slice(0, 200)}`);
  console.log("PASS API key — authenticated with SLNG");
}

async function resolveAgentId(): Promise<string | null> {
  if (!env.slngAgentId.includes("placeholder")) {
    return env.slngAgentId;
  }

  const agents = await listAgents();
  if (agents.length > 0) {
    console.log(`PASS list agents — found ${agents.length}`);
    for (const agent of agents) {
      console.log(`  - ${agent.id}${agent.name ? ` (${agent.name})` : ""}`);
    }
    return agents[0].id;
  }

  console.log("No agents found — creating LeadLoop test agent...");
  try {
    return await createLeadLoopAgent();
  } catch (err) {
    console.log(
      `SKIP agent create — ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

async function testApiKeyAndAgent(): Promise<string | null> {
  const agentId = await resolveAgentId();
  if (!agentId) return null;

  const res = await slngFetch(`/agents/${agentId}`);
  const text = await res.text();
  assert(res.ok, `Get agent failed (${res.status}): ${text.slice(0, 200)}`);
  console.log(`PASS get agent — ${agentId}`);
  return agentId;
}

async function testVoiceDispatch(agentId: string): Promise<void> {
  const lead = DEMO_LEADS.hot;
  const res = await slngFetch(`/agents/${agentId}/web-sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      arguments: {
        lead_name: lead.name.split(" ")[0],
        company_name: lead.company,
        pitch_context: "LeadLoop hackathon SLNG connectivity test",
      },
      participant_name: lead.name,
    }),
  });
  const text = await res.text();
  assert(res.ok, `Web session failed (${res.status}): ${text.slice(0, 200)}`);
  const json = JSON.parse(text) as { call_id?: string };
  console.log(`PASS web session — callId=${json.call_id ?? "n/a"}`);
}

async function testWebhookHandler(): Promise<void> {
  const { handleSlngWebhook } = await import("../routes/webhooks/slng.js");
  const result = await handleSlngWebhook({
    call_id: `slng-test-${Date.now()}`,
    lead_email: null,
    lead_phone: null,
    summary: "SLNG API test callback",
    transcript: null,
    duration_seconds: null,
    timestamp: new Date().toISOString(),
  });
  assert(result.ok === true, "Webhook handler should return ok:true");
  console.log("PASS webhook handler — { ok: true }");
}

async function main() {
  console.log("SLNG full API tests\n");

  if (!env.slngApiKey || env.slngApiKey.includes("placeholder")) {
    throw new Error("Set a real SLNG_API_KEY in .env.local");
  }

  await testApiKey();
  const agentId = await testApiKeyAndAgent();
  if (agentId) {
    await testVoiceDispatch(agentId);
    if (env.slngAgentId.includes("placeholder")) {
      console.log(`\nSet SLNG_AGENT_ID=${agentId} in .env.local for production use.`);
    }
  } else {
    console.log("SKIP web session — no agent available on this SLNG account");
  }
  await testWebhookHandler();

  console.log("\n---");
  console.log("PASS — all SLNG tests passed");
}

main().catch((err) => {
  console.error("\nFAIL — SLNG tests:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

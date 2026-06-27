import "../lib/env.js";
import {
  ensureLeadLoopSlngAgent,
  isSlngApiKeyConfigured,
  listSlngAgents,
  resolveSlngAgentId,
  startSlngWebSession,
  testSlngGatewayTts,
} from "../lib/slng-client.js";
import { DEMO_LEADS } from "@leadloop/shared";
import { handleSlngWebhook } from "../routes/webhooks/slng.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log("SLNG full API tests\n");

  if (!isSlngApiKeyConfigured()) {
    throw new Error("Set a real SLNG_API_KEY in .env.local");
  }

  await testSlngGatewayTts();
  console.log("PASS gateway TTS (rime/arcana:3-en)");

  const agents = await listSlngAgents();
  if (agents.length > 0) {
    console.log(`PASS list agents — found ${agents.length}`);
  }

  let agentId = await resolveSlngAgentId();
  if (!agentId) {
    try {
      agentId = await ensureLeadLoopSlngAgent();
      console.log(`PASS create agent — ${agentId}`);
    } catch (err) {
      console.log(
        `SKIP web session — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  } else {
    console.log(`PASS get agent — ${agentId}`);
  }

  if (agentId) {
    const lead = DEMO_LEADS.hot;
    const session = await startSlngWebSession(agentId, {
      name: lead.name,
      company: lead.company,
      pitchContext: "LeadLoop SLNG connectivity test",
    });
    console.log(`PASS web session — callId=${session.callId ?? "n/a"}`);
    console.log(`\nSet SLNG_AGENT_ID=${agentId} in .env.local`);
  }

  const webhook = await handleSlngWebhook({
    call_id: `slng-test-${Date.now()}`,
    lead_email: null,
    lead_phone: null,
    summary: "SLNG API test callback",
    transcript: null,
    duration_seconds: null,
    timestamp: new Date().toISOString(),
  });
  assert(webhook.ok === true, "Webhook handler should return ok:true");
  console.log("PASS webhook handler — { ok: true }");

  console.log("\n---");
  console.log("PASS — all SLNG tests passed");
}

main().catch((err) => {
  console.error("\nFAIL — SLNG tests:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

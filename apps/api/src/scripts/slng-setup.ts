import "../lib/env.js";
import { env } from "../lib/env.js";
import {
  createLeadLoopSlngAgent,
  ensureLeadLoopSlngAgent,
  isSlngAgentConfigured,
  isSlngApiKeyConfigured,
  listSlngAgents,
  resolveSlngAgentId,
  startSlngWebSession,
  testSlngGatewayTts,
} from "../lib/slng-client.js";
import { DEMO_LEADS } from "@leadloop/shared";

async function main() {
  console.log("SLNG setup — provision LeadLoop voice agent\n");

  if (!isSlngApiKeyConfigured()) {
    throw new Error("Set SLNG_API_KEY in .env.local (slng_cu_...)");
  }

  const ttsOk = await testSlngGatewayTts();
  console.log(`PASS gateway TTS (rime/arcana:3-en, astra) — ${ttsOk ? "audio bytes received" : "ok"}`);

  const existing = await listSlngAgents();
  if (existing.length > 0) {
    console.log(`Found ${existing.length} existing agent(s):`);
    for (const agent of existing) {
      console.log(`  - ${agent.id}${agent.name ? ` (${agent.name})` : ""}`);
    }
  }

  let agentId: string;
  if (isSlngAgentConfigured()) {
    agentId = env.slngAgentId;
    console.log(`Using SLNG_AGENT_ID from env — ${agentId}`);
  } else {
    try {
      agentId = await ensureLeadLoopSlngAgent();
      console.log(`PASS agent ready — ${agentId}`);
      console.log(`\nAdd to .env.local:\nSLNG_AGENT_ID=${agentId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`WARN could not auto-create agent — ${message}`);
      console.log(
        "\nCreate manually in https://app.slng.ai/agent-infra",
      );
      console.log(
        "Use apps/api/src/fixtures/slng-leadloop-agent.json as the model config reference.",
      );
      console.log(
        "Template vars: lead_name, company_name, pitch_context",
      );
      console.log(
        "\nGateway TTS is working — pipeline voice will use mock until SLNG_AGENT_ID is set.",
      );
      process.exit(0);
    }
  }

  const lead = DEMO_LEADS.hot;
  const session = await startSlngWebSession(agentId, {
    name: lead.name,
    company: lead.company,
    pitchContext: "LeadLoop setup connectivity test",
  });
  console.log(`PASS web session — callId=${session.callId ?? "n/a"}`);

  console.log("\n---");
  console.log("SLNG is ready for pipeline + frontend");
  console.log(`SLNG_AGENT_ID=${agentId}`);
}

main().catch((err) => {
  console.error("\nFAIL — SLNG setup:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

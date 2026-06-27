import "../lib/env.js";
import { ensureLeadLoopWorkflowsViaMcp, isN8nMcpConfigured } from "../lib/n8n-mcp.js";
import { testN8nWebhook } from "../services/n8n.js";

async function main() {
  console.log("n8n setup — import + activate workflows via MCP\n");

  if (!isN8nMcpConfigured()) {
    console.error("FAIL — set N8N_MCP_URL and N8N_MCP_TOKEN in .env.local");
    process.exit(1);
  }

  const result = await ensureLeadLoopWorkflowsViaMcp();
  console.log("PASS — workflows ready");
  console.log(`  callback workflow: ${result.callbackId}`);
  console.log(`  router workflow:   ${result.routerId}`);

  console.log("\nVerifying outbound webhook…");
  const probe = await testN8nWebhook();
  if (probe.ok) {
    console.log(`PASS — webhook HTTP ${probe.status}`);
    if (probe.detail) console.log(`  ${probe.detail}`);
    return;
  }

  console.error(`FAIL — webhook HTTP ${probe.status}`);
  console.error(`  ${probe.detail}`);
  process.exit(1);
}

main().catch((err) => {
  console.error("FAIL —", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

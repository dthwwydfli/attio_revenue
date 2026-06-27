import "../lib/env.js";
import { testN8nWebhook, isN8nConfigured } from "../services/n8n.js";

async function main() {
  console.log("n8n webhook connectivity test\n");

  if (!isN8nConfigured()) {
    console.error("FAIL — set N8N_WEBHOOK_URL in .env.local");
    console.error("Example: N8N_WEBHOOK_URL=https://your-instance.app.n8n.cloud/webhook/leadloop-pipeline");
    process.exit(1);
  }

  const result = await testN8nWebhook();
  if (result.ok) {
    console.log(`PASS — HTTP ${result.status}`);
    if (result.detail) console.log(`Response: ${result.detail}`);
    return;
  }

  console.error(`FAIL — HTTP ${result.status}`);
  console.error(result.detail);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

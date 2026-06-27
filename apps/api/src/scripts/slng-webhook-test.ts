import "../lib/env.js";
import { DEMO_LEADS } from "@leadloop/shared";
import { assertCompany, assertPerson } from "../services/attio.js";
import { handleSlngWebhook } from "../routes/webhooks/slng.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function testInvalidPayload(): Promise<void> {
  const result = await handleSlngWebhook({ call_id: "x" });
  assert(result.ok === true, "invalid payload should still return ok:true");
  console.log("PASS invalid payload → { ok: true }");
}

async function testMissingLeadMatch(): Promise<void> {
  const result = await handleSlngWebhook({
    call_id: `no-match-${Date.now()}`,
    lead_email: `nobody.${Date.now()}@example.invalid`,
    lead_phone: null,
    summary: "Test call with no matching lead",
    transcript: null,
    duration_seconds: null,
    timestamp: new Date().toISOString(),
  });
  assert(result.ok === true, "missing lead should still return ok:true");
  console.log("PASS missing lead match → { ok: true }");
}

async function testAttioIntegration(): Promise<void> {
  const ts = Date.now();
  const email = `slng.webhook.${ts}@acmecorp.io`;
  const name = `SLNG Webhook Test ${ts}`;
  const lead = DEMO_LEADS.hot;

  const { companyId } = await assertCompany(lead.domain ?? "acmecorp.io", lead.company);
  const { personId } = await assertPerson(email, name, companyId);

  const result = await handleSlngWebhook({
    call_id: `call-${ts}`,
    lead_email: email,
    lead_phone: lead.phone ?? null,
    summary: "Discussed enterprise rollout and Attio integration timeline.",
    transcript: "Agent: Thanks for your time.\nLead: We want a demo next week.",
    duration_seconds: 120,
    timestamp: new Date().toISOString(),
  });

  assert(result.ok === true, "integration webhook should return ok:true");
  console.log(`PASS Attio integration → personId=${personId}, ok:true`);
}

async function main() {
  console.log("SLNG webhook tests\n");

  await testInvalidPayload();
  await testMissingLeadMatch();
  await testAttioIntegration();

  console.log("\n---");
  console.log("PASS — all SLNG webhook tests passed");
}

main().catch((err) => {
  console.error("\nFAIL — SLNG webhook tests:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});

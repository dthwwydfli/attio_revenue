import "../config.js";
import {
  createSelectAttribute,
  createTextAttribute,
  createNumberAttribute,
} from "../services/attio.js";

async function main() {
  console.log("Setting up Attio custom attributes for LeadLoop...\n");

  const personAttrs = [
    () => createNumberAttribute("people", "lead_score", "Lead Score"),
    () =>
      createSelectAttribute("people", "lead_band", "Lead Band", [
        "hot",
        "warm",
        "cold",
        "needs_review",
      ]),
    () =>
      createSelectAttribute("people", "routing_status", "Routing Status", [
        "processing",
        "routed",
        "voice_pending",
        "completed",
        "failed",
      ]),
    () => createTextAttribute("people", "agent_summary", "Agent Summary"),
    () => createTextAttribute("people", "source", "Lead Source"),
  ];

  const companyAttrs = [
    () => createTextAttribute("companies", "enrichment_summary", "Enrichment Summary"),
    () => createTextAttribute("companies", "employee_band", "Employee Band"),
    () => createTextAttribute("companies", "industry_tag", "Industry Tag"),
  ];

  for (const fn of [...personAttrs, ...companyAttrs]) {
    try {
      const result = await fn();
      console.log("✓", JSON.stringify(result).slice(0, 120));
    } catch (err) {
      console.error("✗", err instanceof Error ? err.message : err);
    }
  }

  console.log("\nDone. Verify attributes in Attio Settings → Objects.");
}

main().catch(console.error);

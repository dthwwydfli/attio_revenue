import "../lib/env.js";
import { DEMO_LEADS } from "@leadloop/shared";
import { enrichLead } from "../services/enrich.js";

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const scenario = (args[0] ?? "hot") as keyof typeof DEMO_LEADS;
  const lead = DEMO_LEADS[scenario] ?? DEMO_LEADS.hot;

  console.log(`Enriching ${lead.company} (${lead.domain ?? "no domain"})...\n`);

  const result = await enrichLead(lead.company, lead.domain);
  console.log(JSON.stringify(result, null, 2));
  console.log(`\nSource: ${result.source}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

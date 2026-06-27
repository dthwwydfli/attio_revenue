import "../lib/env.js";
import { DEMO_LEADS } from "@leadloop/shared";
import { assertCompany, assertPerson, createNote } from "../services/attio.js";
import { attioPersonUrl, attioCompanyUrl } from "../lib/env.js";

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const name = args[0] ?? `Jordan Lee ${Date.now()}`;
  const email = args[1] ?? `jordan.lee.${Date.now()}@acmecorp.io`;
  const company = args[2] ?? DEMO_LEADS.hot.company;
  const domain = args[3] ?? DEMO_LEADS.hot.domain ?? "acmecorp.io";

  console.log(`Testing Attio assert for ${name} (${email})...\n`);

  const { companyId } = await assertCompany(domain, company);
  console.log("Company ID:", companyId);
  console.log("Company URL:", attioCompanyUrl(companyId));

  const { personId } = await assertPerson(email, name, companyId);
  console.log("Person ID:", personId);
  console.log("Person URL:", attioPersonUrl(personId));

  const { noteId } = await createNote(
    personId,
    `## LeadLoop Test Note\n\nTest run for **${name}** (${email}).`,
  );
  console.log("Note ID:", noteId);

  console.log("\nAttio test complete.");
}

main().catch(console.error);

import "../config.js";
import { DEMO_LEADS } from "@leadloop/shared";
import { upsertLeadRecords, createNote } from "../services/attio.js";

async function main() {
  const lead = DEMO_LEADS.hot;
  console.log("Testing Attio assert with demo hot lead...\n");

  const domain = lead.domain ?? "acmecorp.io";
  const result = await upsertLeadRecords(lead, domain);
  console.log("Upsert result:", JSON.stringify(result, null, 2));

  if (result.personRecordId) {
    const note = await createNote(
      "people",
      result.personRecordId,
      "LeadLoop Test Note",
      "This is a test note from LeadLoop attio:test script.",
    );
    console.log("Note result:", JSON.stringify(note, null, 2));
  }

  console.log("\nAttio test complete.");
}

main().catch(console.error);

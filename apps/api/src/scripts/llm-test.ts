import "../lib/env.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnrichmentResult } from "@leadloop/shared";
import { DEMO_LEADS } from "@leadloop/shared";
import { scoreLead } from "../services/scoring.js";
import {
  generateAgentNotes,
  generateCallScript,
  generateEmailReply,
  generateLeadSummary,
  generateRoutingDecision,
} from "../services/llm.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const scenario = (process.argv[2] ?? "hot") as keyof typeof DEMO_LEADS;
  const lead = DEMO_LEADS[scenario] ?? DEMO_LEADS.hot;
  const fixturePath = resolve(__dirname, `../fixtures/enrichment/${scenario}.json`);
  const enrichment = JSON.parse(readFileSync(fixturePath, "utf8")) as EnrichmentResult;
  const scoring = await scoreLead(enrichment);
  const ctx = { lead, enrichment, scoring };

  console.log(`LLM action test — ${scenario}\n`);
  console.log("Scoring:", `${scoring.band} (${scoring.score}) via ${scoring.source}\n`);

  const email = await generateEmailReply(ctx);
  const summary = await generateLeadSummary(ctx);
  const script = await generateCallScript(ctx);
  const routing = await generateRoutingDecision(ctx);
  const notes = await generateAgentNotes(ctx);

  console.log("Email:", JSON.stringify(email, null, 2));
  console.log("\nSummary:", JSON.stringify(summary, null, 2));
  console.log("\nCall script:", JSON.stringify(script, null, 2));
  console.log("\nRouting:", JSON.stringify(routing, null, 2));
  console.log("\nNotes:", JSON.stringify(notes, null, 2));

  const passed = [email, summary, script, routing, notes].every((r) => r.source === "gemini");
  console.log("\n---");
  console.log(passed ? "PASS — all outputs from Gemini" : "FAIL — one or more outputs used fallback/other provider");
  process.exit(passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

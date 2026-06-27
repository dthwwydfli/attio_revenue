import "../lib/env.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnrichmentResult } from "@leadloop/shared";
import { buildProfileText, scoreLead } from "../services/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const scenario = process.argv[2] ?? "hot";
  const fixturePath = resolve(__dirname, `../fixtures/enrichment/${scenario}.json`);
  const enrichment = JSON.parse(readFileSync(fixturePath, "utf8")) as EnrichmentResult;

  console.log(`Scoring ${scenario} enrichment fixture...\n`);
  console.log("Profile text:", buildProfileText(enrichment));
  console.log("");

  const result = await scoreLead(enrichment);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);

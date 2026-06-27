import { SIEClient } from "@superlinked/sie-sdk";
import "../lib/env.js";
import { env } from "../lib/env.js";
import { generateEmailReply } from "../services/llm.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnrichmentResult } from "@leadloop/shared";
import { DEMO_LEADS } from "@leadloop/shared";
import { scoreLead } from "../services/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testSieGenerate(): Promise<boolean> {
  if (!env.sieApiKey) {
    console.log("SKIP generate — SIE_API_KEY not set in environment");
    return false;
  }

  const client = new SIEClient(env.sieEndpoint, {
    apiKey: env.sieApiKey,
    timeout: 120_000,
  });

  try {
    const result = await client.generate(env.sieLlmModel, 'Return JSON only: {"ok":true}', {
      maxNewTokens: 32,
      temperature: 0,
    });
    console.log("PASS SIE generate");
    console.log("  text:", result.text.slice(0, 120));
    console.log("  usage:", result.usage ?? "n/a");
    return true;
  } catch (err) {
    console.log("FAIL SIE generate:", err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    await client.close();
  }
}

async function testLlmEmail(): Promise<boolean> {
  const enrichment = JSON.parse(
    readFileSync(resolve(__dirname, "../fixtures/enrichment/hot.json"), "utf8"),
  ) as EnrichmentResult;
  const lead = DEMO_LEADS.hot;
  const scoring = await scoreLead(enrichment);
  const email = await generateEmailReply({ lead, enrichment, scoring });

  console.log("\nLLM email result:");
  console.log("  source:", email.source);
  console.log("  confidence:", email.confidence);
  console.log("  subject:", email.subject);

  if (email.source === "sie") {
    console.log("PASS LLM email via SIE");
    return true;
  }

  console.log(`FAIL LLM email — source=${email.source} (expected sie)`);
  return false;
}

async function main() {
  console.log("SIE endpoint:", env.sieEndpoint);
  console.log("SIE API key set:", Boolean(env.sieApiKey));
  console.log("SIE LLM model:", env.sieLlmModel);
  console.log("");

  const generateOk = await testSieGenerate();
  const emailOk = await testLlmEmail();

  console.log("\n---");
  console.log("SIE generate:", generateOk ? "PASS" : "FAIL");
  console.log("LLM email:", emailOk ? "PASS" : "FAIL");
  process.exit(generateOk && emailOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

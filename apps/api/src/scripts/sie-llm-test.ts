import "../lib/env.js";
import { env } from "../lib/env.js";
import { generateEmailReply } from "../services/llm.js";
import {
  closeSieClient,
  createSieClient,
  isSieConfigured,
  SIE_FAST_LLM_GPU,
} from "../lib/sie-client.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnrichmentResult } from "@leadloop/shared";
import { DEMO_LEADS } from "@leadloop/shared";
import { scoreLead } from "../services/scoring.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function testSieGenerate(): Promise<boolean> {
  if (!isSieConfigured()) {
    console.log("SKIP generate — SIE_API_KEY not set in environment");
    return false;
  }

  let client: ReturnType<typeof createSieClient> | undefined;
  try {
    client = createSieClient();
    const result = await client.generate(env.sieLlmModel, 'Return JSON only: {"ok":true}', {
      maxNewTokens: 32,
      temperature: 0,
      gpu: env.sieLlmGpu || SIE_FAST_LLM_GPU,
      waitForCapacity: true,
    });
    console.log("PASS SIE generate (hot lane)");
    console.log("  text:", result.text.slice(0, 120));
    console.log("  usage:", result.usage ?? "n/a");
    return true;
  } catch (err) {
    console.log("FAIL SIE generate:", err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    await closeSieClient(client);
  }
}

async function testLlmEmailViaSie(): Promise<boolean> {
  const prevGemini = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = "";

  try {
    const enrichment = JSON.parse(
      readFileSync(resolve(__dirname, "../fixtures/enrichment/hot.json"), "utf8"),
    ) as EnrichmentResult;
    const lead = DEMO_LEADS.hot;
    const scoring = await scoreLead(enrichment);
    const email = await generateEmailReply({ lead, enrichment, scoring });

    console.log("\nLLM email result (Gemini disabled):");
    console.log("  source:", email.source);
    console.log("  subject:", email.subject);

    if (email.source === "sie") {
      console.log("PASS LLM email via SIE cluster");
      return true;
    }

    console.log(`FAIL LLM email — source=${email.source} (expected sie)`);
    return false;
  } finally {
    process.env.GEMINI_API_KEY = prevGemini;
  }
}

async function main() {
  console.log("SIE LLM integration test\n");
  console.log("SIE endpoint:", env.sieEndpoint);
  console.log("SIE API key set:", Boolean(env.sieApiKey));
  console.log("SIE LLM model:", env.sieLlmModel);
  console.log("SIE LLM GPU:", env.sieLlmGpu);
  console.log("");

  const generateOk = await testSieGenerate();
  const emailOk = isSieConfigured() ? await testLlmEmailViaSie() : false;

  console.log("\n---");
  console.log("SIE generate:", generateOk ? "PASS" : "FAIL");
  console.log("LLM email via SIE:", emailOk ? "PASS" : isSieConfigured() ? "FAIL" : "SKIP");
  process.exit(generateOk && (emailOk || !isSieConfigured()) ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

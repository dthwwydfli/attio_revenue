import "../lib/env.js";
import { env } from "../lib/env.js";
import {
  closeSieClient,
  createSieClient,
  getWarmLlmRoute,
  isSieConfigured,
  SIE_ENCODE_MODEL,
  SIE_WARM_LLM_MODEL,
  warmupSieLlmLane,
} from "../lib/sie-client.js";

async function testHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`${env.sieEndpoint}/healthz`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) {
      console.log(`FAIL health — HTTP ${res.status}`);
      return false;
    }
    console.log("PASS SIE cluster health");
    return true;
  } catch (err) {
    console.log("FAIL health:", err instanceof Error ? err.message : String(err));
    return false;
  }
}

async function testEncode(): Promise<boolean> {
  if (!isSieConfigured()) {
    console.log("SKIP encode — SIE_API_KEY not configured");
    return false;
  }

  let client: ReturnType<typeof createSieClient> | undefined;
  try {
    client = createSieClient();
    const result = await client.encode(
      SIE_ENCODE_MODEL,
      { text: "Hello from LeadLoop hackathon cluster." },
      { waitForCapacity: true },
    );
    if (!result.dense?.length) {
      console.log("FAIL encode — missing dense vector");
      return false;
    }
    console.log(`PASS SIE encode — dims=${result.dense.length}`);
    return true;
  } catch (err) {
    console.log("FAIL encode:", err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    await closeSieClient(client);
  }
}

async function testWarmLane(): Promise<boolean> {
  if (!isSieConfigured()) {
    console.log("SKIP warm lane — SIE_API_KEY not configured");
    return false;
  }

  const route = getWarmLlmRoute();
  console.log(`Warming LLM lane: ${route.model} @ ${route.gpu}...`);
  const ok = await warmupSieLlmLane();
  if (ok) {
    console.log(`PASS warm lane ready (${SIE_WARM_LLM_MODEL} @ rtx6000)`);
    return true;
  }
  console.log("FAIL warm lane warmup");
  return false;
}

async function testGenerate(): Promise<boolean> {
  if (!isSieConfigured()) {
    console.log("SKIP generate — SIE_API_KEY not configured");
    return false;
  }

  const route = getWarmLlmRoute();
  let client: ReturnType<typeof createSieClient> | undefined;

  try {
    client = createSieClient({ gpu: route.gpu, timeout: 180_000, provisionTimeout: 180_000 });
    const result = await client.generate(
      route.model,
      'Return JSON only: {"ok":true}',
      {
        maxNewTokens: 32,
        temperature: 0,
        gpu: route.gpu,
        waitForCapacity: true,
      },
    );
    console.log(`PASS SIE generate (warm lane ${route.model} @ ${route.gpu})`);
    console.log("  model:", result.model);
    console.log("  text:", result.text.slice(0, 120));
    return true;
  } catch (err) {
    console.log("FAIL generate:", err instanceof Error ? err.message : String(err));
    return false;
  } finally {
    await closeSieClient(client);
  }
}

async function main() {
  console.log("SIE hackathon cluster tests\n");
  console.log("Endpoint:", env.sieEndpoint);
  console.log("API key set:", Boolean(env.sieApiKey));
  console.log("Encode GPU:", env.sieEncodeGpu);
  console.log("LLM model:", env.sieLlmModel);
  console.log("LLM GPU:", env.sieLlmGpu);
  console.log("");

  const healthOk = await testHealth();
  const encodeOk = isSieConfigured() ? await testEncode() : false;
  const warmOk = isSieConfigured() ? await testWarmLane() : false;
  const generateOk = isSieConfigured() ? await testGenerate() : false;

  console.log("\n---");
  console.log("Health:", healthOk ? "PASS" : "FAIL");
  console.log("Encode:", !isSieConfigured() ? "SKIP" : encodeOk ? "PASS" : "FAIL");
  console.log("Warm lane:", !isSieConfigured() ? "SKIP" : warmOk ? "PASS" : "FAIL");
  console.log("Generate:", !isSieConfigured() ? "SKIP" : generateOk ? "PASS" : "FAIL");

  if (!isSieConfigured()) {
    console.log("\nSet SIE_ENDPOINT and SIE_API_KEY in .env.local to run encode/generate tests.");
    process.exit(healthOk ? 0 : 1);
  }

  process.exit(healthOk && encodeOk && warmOk && generateOk ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

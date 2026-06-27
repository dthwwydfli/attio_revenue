import { SIEClient, type SIEClientOptions } from "@superlinked/sie-sdk";
import { env } from "./env.js";

/** Default-bundle models (embeddings, rerankers) route to the L4 lane on the hackathon cluster. */
export const SIE_ENCODE_MODEL = "sentence-transformers/all-MiniLM-L6-v2";
export const SIE_DEFAULT_BUNDLE_GPU = "l4";

/** Hot generation lane target from hackathon docs (may cold-load). */
export const SIE_FAST_LLM_MODEL = "Qwen/Qwen3.5-4B";
export const SIE_FAST_LLM_GPU = "rtx6000";

/** Warm lane — already loaded on the hackathon cluster (use this for reliable LLM). */
export const SIE_WARM_LLM_MODEL = "Qwen/Qwen3-4B-Instruct-2507";
/** @deprecated alias */
export const SIE_LOADED_LLM_MODEL = SIE_WARM_LLM_MODEL;

/** Larger hot generation lane (optional). */
export const SIE_LARGE_LLM_MODEL = "Qwen/Qwen3.6-27B:rtx-pro-6000";
export const SIE_LARGE_LLM_GPU = "rtx6000-qwen27";

export const SIE_PROVISION_TIMEOUT_MS = 900_000;
export const SIE_REQUEST_TIMEOUT_MS = 900_000;

let warmLaneReady = false;

export function getWarmLlmRoute(): { model: string; gpu: string } {
  return {
    model: env.sieLlmModel || SIE_WARM_LLM_MODEL,
    gpu: env.sieLlmGpu || SIE_FAST_LLM_GPU,
  };
}

/** Ping the warm rtx6000 lane so the first real LLM call is fast. */
export async function warmupSieLlmLane(): Promise<boolean> {
  if (!isSieConfigured()) return false;

  const { model, gpu } = getWarmLlmRoute();
  let client: SIEClient | undefined;

  try {
    client = createSieClient({ gpu, timeout: 120_000, provisionTimeout: 120_000 });
    await client.generate(model, 'Return JSON only: {"warm":true}', {
      maxNewTokens: 16,
      temperature: 0,
      gpu,
      waitForCapacity: true,
    });
    warmLaneReady = true;
    return true;
  } catch {
    return false;
  } finally {
    await closeSieClient(client);
  }
}

export async function ensureWarmLlmLane(): Promise<void> {
  if (warmLaneReady) return;
  await warmupSieLlmLane();
}

export function isWarmLaneReady(): boolean {
  return warmLaneReady;
}

export function isSieConfigured(): boolean {
  const key = env.sieApiKey.trim();
  return Boolean(env.sieEndpoint && key && !key.includes("placeholder"));
}

export function createSieClient(overrides?: Partial<SIEClientOptions>): SIEClient {
  return new SIEClient(env.sieEndpoint, {
    apiKey: env.sieApiKey || undefined,
    gpu: env.sieEncodeGpu,
    waitForCapacity: true,
    provisionTimeout: env.sieProvisionTimeoutMs,
    timeout: env.sieRequestTimeoutMs,
    ...overrides,
  });
}

export async function closeSieClient(client: SIEClient | undefined): Promise<void> {
  try {
    await client?.close();
  } catch {
    // ignore
  }
}

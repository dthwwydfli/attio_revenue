import { env } from "./env.js";
import { isSlngConfigured } from "../services/slng.js";
import { isN8nConfigured, testN8nWebhook } from "../services/n8n.js";

export function isConfiguredKey(key: string | undefined): boolean {
  if (!key) return false;
  const k = key.trim().toLowerCase();
  return Boolean(k && !k.includes("placeholder") && k !== "sk-dev-placeholder");
}

let n8nProbeCache: { ok: boolean; at: number } | null = null;
const N8N_PROBE_TTL_MS = 60_000;

export async function getIntegrationHealthAsync() {
  const base = getIntegrationHealth();
  if (!isN8nConfigured()) {
    return { ...base, n8n: false };
  }

  const now = Date.now();
  if (!n8nProbeCache || now - n8nProbeCache.at > N8N_PROBE_TTL_MS) {
    const probe = await testN8nWebhook();
    n8nProbeCache = { ok: probe.ok, at: now };
  }

  return { ...base, n8n: n8nProbeCache.ok };
}

export function getIntegrationHealth() {
  return {
    attio: isConfiguredKey(env.attioApiKey),
    tavily: isConfiguredKey(env.tavilyApiKey),
    serper: isConfiguredKey(env.serperApiKey),
    gemini: isConfiguredKey(env.geminiApiKey),
    openai: isConfiguredKey(env.openaiApiKey),
    anthropic: isConfiguredKey(env.anthropicApiKey),
    slng: isSlngConfigured(),
    sie: isConfiguredKey(env.sieApiKey) && Boolean(env.sieEndpoint),
    n8n: isN8nConfigured(),
  };
}

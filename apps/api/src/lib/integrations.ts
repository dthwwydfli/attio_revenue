import { env } from "./env.js";
import { isSlngConfigured } from "../services/slng.js";

export function isConfiguredKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return Boolean(k && !k.includes("placeholder") && k !== "sk-dev-placeholder");
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
    n8n: isConfiguredKey(env.n8nWebhookSecret),
  };
}

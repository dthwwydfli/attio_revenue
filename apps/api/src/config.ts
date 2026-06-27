import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

export const env = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  attioApiKey: process.env.ATTIO_API_KEY ?? "",
  attioWorkspaceSlug: process.env.ATTIO_WORKSPACE_SLUG ?? "",
  tavilyApiKey: process.env.TAVILY_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  sieBaseUrl: process.env.SIE_BASE_URL ?? "http://localhost:8080",
  sieRerankModel:
    process.env.SIE_RERANK_MODEL ?? "cross-encoder/ms-marco-MiniLM-L-6-v2",
  icpDescription:
    process.env.ICP_DESCRIPTION ??
    "B2B SaaS companies, 50-500 employees, US/EU, buying intent for CRM automation, VP Sales or RevOps leaders evaluating agentic CRM tools.",
  slngApiKey: process.env.SLNG_API_KEY ?? "",
  slngAgentId: process.env.SLNG_AGENT_ID ?? "",
  slngWebhookSecret: process.env.SLNG_WEBHOOK_SECRET ?? "",
  n8nWebhookSecret: process.env.N8N_WEBHOOK_SECRET ?? "",
};

export function attioPersonUrl(recordId: string): string {
  const slug = env.attioWorkspaceSlug || "YOUR_WORKSPACE";
  return `https://app.attio.com/${slug}/person/${recordId}`;
}

export function attioCompanyUrl(recordId: string): string {
  const slug = env.attioWorkspaceSlug || "YOUR_WORKSPACE";
  return `https://app.attio.com/${slug}/company/${recordId}`;
}

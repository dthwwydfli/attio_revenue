import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "../../../../.env") });
config({ path: resolve(__dirname, "../../../../.env.local"), override: true });
config({ path: resolve(__dirname, "../../.env") });
config({ path: resolve(__dirname, "../../.env.local"), override: true });

const EnvSchema = z
  .object({
    ATTIO_API_KEY: z.string().min(1, "ATTIO_API_KEY is required"),
    ATTIO_WORKSPACE_SLUG: z.string().min(1, "ATTIO_WORKSPACE_SLUG is required"),
    OPENAI_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    TAVILY_API_KEY: z.string().optional(),
    SERPER_API_KEY: z.string().optional(),
    SIE_BASE_URL: z.string().url("SIE_BASE_URL must be a valid URL").optional(),
    SIE_ENDPOINT: z.string().url("SIE_ENDPOINT must be a valid URL").optional(),
    SIE_API_KEY: z.string().optional(),
    SLNG_API_KEY: z.string().min(1, "SLNG_API_KEY is required"),
    SLNG_AGENT_ID: z.string().min(1, "SLNG_AGENT_ID is required"),
    NEXT_PUBLIC_API_URL: z.string().url("NEXT_PUBLIC_API_URL must be a valid URL"),
    CORS_ORIGIN: z.string().url("CORS_ORIGIN must be a valid URL"),
    PORT: z.coerce.number().int().positive().default(3001),
    API_BASE_URL: z.string().url().optional(),
    SIE_RERANK_MODEL: z.string().optional(),
    ICP_DESCRIPTION: z.string().optional(),
    SLNG_WEBHOOK_SECRET: z.string().optional(),
    N8N_WEBHOOK_SECRET: z.string().optional(),
    NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.OPENAI_API_KEY && !data.GROQ_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either OPENAI_API_KEY or GROQ_API_KEY is required",
        path: ["OPENAI_API_KEY"],
      });
    }
    if (!data.TAVILY_API_KEY && !data.SERPER_API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either TAVILY_API_KEY or SERPER_API_KEY is required",
        path: ["TAVILY_API_KEY"],
      });
    }
    if (!data.SIE_BASE_URL && !data.SIE_ENDPOINT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either SIE_BASE_URL or SIE_ENDPOINT is required",
        path: ["SIE_ENDPOINT"],
      });
    }
  });

function parseEnv() {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    });
    throw new Error(`Environment validation failed:\n${messages.join("\n")}`);
  }
  return result.data;
}

const parsed = parseEnv();

export const env = {
  nodeEnv: parsed.NODE_ENV ?? "development",
  port: parsed.PORT,
  corsOrigin: parsed.CORS_ORIGIN,
  apiBaseUrl: parsed.API_BASE_URL ?? parsed.NEXT_PUBLIC_API_URL,
  nextPublicApiUrl: parsed.NEXT_PUBLIC_API_URL,
  attioApiKey: parsed.ATTIO_API_KEY,
  attioWorkspaceSlug: parsed.ATTIO_WORKSPACE_SLUG,
  openaiApiKey: parsed.OPENAI_API_KEY ?? "",
  groqApiKey: parsed.GROQ_API_KEY ?? "",
  tavilyApiKey: parsed.TAVILY_API_KEY ?? "",
  serperApiKey: parsed.SERPER_API_KEY ?? "",
  sieEndpoint: parsed.SIE_ENDPOINT ?? parsed.SIE_BASE_URL ?? "http://localhost:8080",
  sieApiKey: parsed.SIE_API_KEY ?? "",
  sieBaseUrl: parsed.SIE_ENDPOINT ?? parsed.SIE_BASE_URL ?? "http://localhost:8080",
  sieRerankModel:
    parsed.SIE_RERANK_MODEL ?? "cross-encoder/ms-marco-MiniLM-L-6-v2",
  icpDescription:
    parsed.ICP_DESCRIPTION ??
    "B2B SaaS companies, 50-500 employees, US/EU, buying intent for CRM automation, VP Sales or RevOps leaders evaluating agentic CRM tools.",
  slngApiKey: parsed.SLNG_API_KEY,
  slngAgentId: parsed.SLNG_AGENT_ID,
  slngWebhookSecret: parsed.SLNG_WEBHOOK_SECRET ?? "",
  n8nWebhookSecret: parsed.N8N_WEBHOOK_SECRET ?? "",
} as const;

export type Env = typeof env;

export function attioPersonUrl(recordId: string): string {
  return `https://app.attio.com/${env.attioWorkspaceSlug}/person/${recordId}`;
}

export function attioCompanyUrl(recordId: string): string {
  return `https://app.attio.com/${env.attioWorkspaceSlug}/company/${recordId}`;
}

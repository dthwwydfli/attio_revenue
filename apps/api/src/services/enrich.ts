import type { LeadInput, EnrichmentResult } from "@leadloop/shared";
import { ENRICHMENT_FIXTURES } from "@leadloop/shared";
import { env } from "../config.js";
import { inferDomain } from "@leadloop/shared";

export async function enrichLead(input: LeadInput, domain: string): Promise<EnrichmentResult> {
  const fixture = ENRICHMENT_FIXTURES[domain];
  if (fixture) {
    return fixture;
  }

  if (env.tavilyApiKey) {
    try {
      return await enrichWithTavily(input, domain);
    } catch {
      // fall through to mock
    }
  }

  return mockEnrichment(input, domain);
}

async function enrichWithTavily(input: LeadInput, domain: string): Promise<EnrichmentResult> {
  const query = `${input.company} ${domain} company industry employees news`;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: env.tavilyApiKey,
      query,
      search_depth: "basic",
      max_results: 3,
    }),
  });

  if (!res.ok) {
    throw new Error(`Tavily error: ${res.status}`);
  }

  const json = (await res.json()) as {
    results?: Array<{ title?: string; content?: string }>;
  };

  const snippets = (json.results ?? [])
    .map((r) => r.content ?? r.title ?? "")
    .filter(Boolean)
    .slice(0, 2);

  const combined = snippets.join(" ");

  return {
    description: combined.slice(0, 400) || `${input.company} — inbound lead from ${input.source}.`,
    industry: inferIndustry(combined, input),
    employeeBand: inferEmployeeBand(combined),
    domain,
    news: snippets.map((s) => s.slice(0, 120)),
    source: "tavily",
  };
}

function inferIndustry(text: string, input: LeadInput): string {
  const lower = text.toLowerCase();
  if (lower.includes("saas") || lower.includes("software")) return "B2B SaaS";
  if (lower.includes("retail")) return "Retail";
  if (lower.includes("fintech") || lower.includes("finance")) return "Fintech";
  if (input.role?.toLowerCase().includes("sales")) return "Sales Tech";
  return "Unknown";
}

function inferEmployeeBand(text: string): string {
  const match = text.match(/(\d{1,4})\s*[-–]\s*(\d{1,4})\s*employees/i);
  if (match) return `${match[1]}-${match[2]}`;
  if (/enterprise|500\+/i.test(text)) return "500+";
  if (/startup|small business/i.test(text)) return "1-50";
  return "Unknown";
}

function mockEnrichment(input: LeadInput, domain: string): EnrichmentResult {
  return {
    description: `${input.company} submitted an inbound inquiry via ${input.source}. Role: ${input.role ?? "unknown"}.`,
    industry: input.role?.includes("Revenue") || input.role?.includes("Sales") ? "B2B SaaS" : "General",
    employeeBand: "Unknown",
    domain,
    news: [],
    source: "mock",
  };
}

export function buildProfileText(
  input: LeadInput,
  enrichment: EnrichmentResult,
  domain: string,
): string {
  return [
    `Lead: ${input.name}, ${input.role ?? "Unknown role"} at ${input.company}`,
    `Email: ${input.email}, Domain: ${domain}`,
    `Message: ${input.message ?? "No message"}`,
    `Company: ${enrichment.description}`,
    `Industry: ${enrichment.industry}, Size: ${enrichment.employeeBand}`,
    enrichment.news.length ? `Recent: ${enrichment.news.join(". ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export { inferDomain };

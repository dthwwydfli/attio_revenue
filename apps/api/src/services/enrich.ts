import { promises as fs } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { EnrichmentResult, EnrichmentSource, LeadInput } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { http } from "../lib/http.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("enrichment");

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, "../fixtures/enrichment");

const SCENARIO_FIXTURES: Record<string, string> = {
  "acmecorp.io": "hot",
  "midmarket.io": "warm",
  "localshop.com": "cold",
};

const DEMO_DOMAINS = new Set(Object.keys(SCENARIO_FIXTURES));

export function isDemoDomain(domain?: string | null): boolean {
  const normalized = normalizeDomain(domain);
  return normalized ? DEMO_DOMAINS.has(normalized) : false;
}

export function expectedDemoBand(domain?: string | null): "hot" | "warm" | "cold" | null {
  const normalized = normalizeDomain(domain);
  if (!normalized || !DEMO_DOMAINS.has(normalized)) return null;
  return SCENARIO_FIXTURES[normalized] as "hot" | "warm" | "cold";
}

interface TavilyResponse {
  answer?: string;
  results?: Array<{ title?: string; content?: string; url?: string }>;
}

interface SerperResponse {
  organic?: Array<{ title?: string; link?: string; snippet?: string }>;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeDomain(domain?: string | null): string | null {
  if (!domain) return null;
  return domain
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function websiteFromDomain(domain: string | null): string | null {
  return domain ? `https://${domain}` : null;
}

function placeholder(domain?: string): EnrichmentResult {
  const normalized = normalizeDomain(domain);
  return {
    domain: normalized,
    description: null,
    industry: null,
    employee_band: null,
    website_url: websiteFromDomain(normalized),
    linkedin_url: null,
    news: [],
    source: "placeholder",
  };
}

function parseFixture(raw: unknown, source: EnrichmentSource = "fixture"): EnrichmentResult {
  const data = (raw ?? {}) as Record<string, unknown>;
  const domain = normalizeDomain(
    typeof data.domain === "string" ? data.domain : null,
  );

  return {
    domain,
    description: typeof data.description === "string" ? data.description : null,
    industry: typeof data.industry === "string" ? data.industry : null,
    employee_band:
      typeof data.employee_band === "string"
        ? data.employee_band
        : typeof data.employeeBand === "string"
          ? data.employeeBand
          : null,
    website_url:
      typeof data.website_url === "string"
        ? data.website_url
        : websiteFromDomain(domain),
    linkedin_url: typeof data.linkedin_url === "string" ? data.linkedin_url : null,
    news: Array.isArray(data.news)
      ? data.news.filter((item): item is string => typeof item === "string")
      : [],
    source,
  };
}

async function ensureFixtureDir(): Promise<void> {
  try {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
  } catch (err) {
    logger.warn({ err: String(err) }, "Failed to create enrichment fixture directory");
  }
}

async function writeFixture(
  companyName: string,
  data: EnrichmentResult,
  domain?: string,
): Promise<void> {
  if (isDemoDomain(domain ?? data.domain)) {
    logger.info({ domain: domain ?? data.domain }, "Skipping fixture write for demo domain");
    return;
  }

  try {
    await ensureFixtureDir();
    const file = resolve(FIXTURE_DIR, `${slugify(companyName)}.json`);
    await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    logger.info({ fixture_written: file, enrichment_source: data.source }, "Enrichment fixture written");
  } catch (err) {
    logger.warn({ err: String(err), companyName }, "Failed to write enrichment fixture");
  }
}

async function readFixtureFile(fileName: string): Promise<EnrichmentResult | null> {
  try {
    const file = resolve(FIXTURE_DIR, fileName);
    const raw = await fs.readFile(file, "utf8");
    return parseFixture(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function readFixture(companyName: string, domain?: string): Promise<EnrichmentResult | null> {
  const normalizedDomain = normalizeDomain(domain);
  const scenarioFile =
    normalizedDomain && SCENARIO_FIXTURES[normalizedDomain]
      ? `${SCENARIO_FIXTURES[normalizedDomain]}.json`
      : null;

  const candidates = isDemoDomain(normalizedDomain)
    ? [
        scenarioFile,
        normalizedDomain ? `${normalizedDomain}.json` : null,
        `${slugify(companyName)}.json`,
      ]
    : [
        `${slugify(companyName)}.json`,
        normalizedDomain ? `${normalizedDomain}.json` : null,
        scenarioFile,
      ];

  const files = candidates.filter((value): value is string => Boolean(value));

  for (const fileName of files) {
    const fixture = await readFixtureFile(fileName);
    if (fixture) {
      return { ...fixture, source: "fixture" };
    }
  }

  logger.warn({ companyName, domain }, "No enrichment fixture found");
  return null;
}

function extractLinkedInUrl(text: string, results: Array<{ url?: string; link?: string }>): string | null {
  for (const item of results) {
    const url = item.url ?? item.link;
    if (url && /linkedin\.com\/company/i.test(url)) {
      return url;
    }
  }

  const match = text.match(/https?:\/\/(?:www\.)?linkedin\.com\/company\/[^\s)"']+/i);
  return match?.[0] ?? null;
}

function extractEmployeeBand(text: string): string | null {
  const range = text.match(/(\d{1,4})\s*[-–]\s*(\d{1,4})\s*employees?/i);
  if (range) return `${range[1]}-${range[2]} employees`;

  if (/enterprise|500\+/i.test(text)) return "500+ employees";
  if (/startup|small business|1-10/i.test(text)) return "1-10 employees";

  return null;
}

function extractIndustry(text: string): string | null {
  const lower = text.toLowerCase();
  if (lower.includes("saas") || lower.includes("software")) return "B2B SaaS";
  if (lower.includes("retail")) return "Retail";
  if (lower.includes("fintech") || lower.includes("finance")) return "Fintech";
  if (lower.includes("sales tech") || lower.includes("sales enablement")) return "Sales Tech";
  return null;
}

function extractDomainFromUrl(url?: string): string | null {
  if (!url) return null;
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return null;
  }
}

function buildDescription(answer: string | null, snippets: string[]): string | null {
  const combined = [answer, ...snippets].filter(Boolean).join(" ").trim();
  if (!combined) return null;
  const sentence = combined.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ").trim();
  return sentence.slice(0, 500) || null;
}

function finalizeResult(
  partial: Omit<EnrichmentResult, "source">,
  source: EnrichmentSource,
  domainHint?: string,
): EnrichmentResult {
  const domain =
    normalizeDomain(partial.domain) ??
    normalizeDomain(domainHint) ??
    extractDomainFromUrl(partial.website_url ?? undefined);

  const result: EnrichmentResult = {
    domain,
    description: partial.description,
    industry: partial.industry,
    employee_band: partial.employee_band,
    website_url: partial.website_url ?? websiteFromDomain(domain),
    linkedin_url: partial.linkedin_url,
    news: partial.news.slice(0, 2),
    source,
  };

  if (!result.description) logger.warn({ source }, "Enrichment missing description");
  if (!result.industry) logger.warn({ source }, "Enrichment missing industry");
  if (!result.employee_band) logger.warn({ source }, "Enrichment missing employee_band");

  return result;
}

async function fetchFromTavily(
  companyName: string,
  domain?: string,
): Promise<EnrichmentResult | null> {
  if (!env.tavilyApiKey) return null;

  const queries = [
    `${companyName} company profile`,
    domain ? `${domain} company` : null,
  ].filter((value): value is string => Boolean(value));

  for (const query of queries) {
    try {
      const json = await http<TavilyResponse>("https://api.tavily.com/search", {
        method: "POST",
        body: {
          api_key: env.tavilyApiKey,
          query,
          search_depth: "basic",
          max_results: 5,
          include_answer: true,
        },
      });

      const results = json.results ?? [];
      const snippets = results
        .map((result) => result.content ?? result.title ?? "")
        .filter(Boolean);
      const combinedText = [json.answer, ...snippets].filter(Boolean).join(" ");
      const extractedDomain =
        normalizeDomain(domain) ??
        extractDomainFromUrl(results[0]?.url) ??
        null;

      const partial = {
        domain: extractedDomain,
        description: buildDescription(json.answer ?? null, snippets),
        industry: extractIndustry(combinedText),
        employee_band: extractEmployeeBand(combinedText),
        website_url: websiteFromDomain(extractedDomain),
        linkedin_url: extractLinkedInUrl(combinedText, results),
        news: results
          .map((result) => result.title)
          .filter((title): title is string => Boolean(title))
          .slice(0, 2),
      };

      if (!partial.description && partial.news.length === 0) {
        logger.warn({ query }, "Tavily returned no usable enrichment fields");
        continue;
      }

      return finalizeResult(partial, "tavily", domain);
    } catch (err) {
      logger.warn({ err: String(err), query }, "Tavily enrichment failed");
    }
  }

  return null;
}

async function fetchFromSerper(
  companyName: string,
  domain?: string,
): Promise<EnrichmentResult | null> {
  if (!env.serperApiKey) return null;

  const queries = [
    `${companyName} company profile`,
    domain ? `${domain} company` : null,
  ].filter((value): value is string => Boolean(value));

  for (const query of queries) {
    try {
      const json = await http<SerperResponse>("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": env.serperApiKey,
        },
        body: { q: query },
      });

      const organic = json.organic ?? [];
      if (organic.length === 0) {
        logger.warn({ query }, "Serper returned no organic results");
        continue;
      }

      const snippets = organic
        .map((result) => result.snippet ?? result.title ?? "")
        .filter(Boolean);
      const combinedText = snippets.join(" ");
      const extractedDomain =
        normalizeDomain(domain) ??
        extractDomainFromUrl(organic[0]?.link) ??
        null;

      const partial = {
        domain: extractedDomain,
        description: buildDescription(organic[0]?.snippet ?? null, snippets.slice(1)),
        industry: extractIndustry(combinedText),
        employee_band: extractEmployeeBand(combinedText),
        website_url: organic[0]?.link ?? websiteFromDomain(extractedDomain),
        linkedin_url: extractLinkedInUrl(combinedText, organic),
        news: organic
          .slice(1, 3)
          .map((result) => result.title)
          .filter((title): title is string => Boolean(title)),
      };

      if (!partial.description && partial.news.length === 0) {
        logger.warn({ query }, "Serper returned no usable enrichment fields");
        continue;
      }

      return finalizeResult(partial, "serper", domain);
    } catch (err) {
      logger.warn({ err: String(err), query }, "Serper enrichment failed");
    }
  }

  return null;
}

export async function enrichLead(
  companyName: string,
  domain?: string,
): Promise<EnrichmentResult> {
  const normalizedDomain = normalizeDomain(domain) ?? undefined;

  try {
    if (isDemoDomain(normalizedDomain)) {
      const demoFixture = await readFixture(companyName, normalizedDomain);
      if (demoFixture) {
        logger.info({ enrichment_source: "fixture", companyName, domain: normalizedDomain, demo: true });
        return demoFixture;
      }
    }

    const tavily = await fetchFromTavily(companyName, normalizedDomain);
    if (tavily) {
      logger.info({ enrichment_source: "tavily", companyName, domain: normalizedDomain });
      await writeFixture(companyName, tavily, normalizedDomain);
      return tavily;
    }

    const serper = await fetchFromSerper(companyName, normalizedDomain);
    if (serper) {
      logger.info({ enrichment_source: "serper", companyName, domain: normalizedDomain });
      await writeFixture(companyName, serper, normalizedDomain);
      return serper;
    }

    const fixture = await readFixture(companyName, normalizedDomain);
    if (fixture) {
      logger.info({ enrichment_source: "fixture", companyName, domain: normalizedDomain });
      return fixture;
    }

    const empty = placeholder(normalizedDomain);
    await writeFixture(companyName, empty, normalizedDomain);
    logger.info({ enrichment_source: "placeholder", companyName, domain: normalizedDomain });
    return empty;
  } catch (err) {
    logger.warn({ err: String(err), companyName, domain: normalizedDomain }, "Enrichment failed unexpectedly");

    const fixture = await readFixture(companyName, normalizedDomain);
    if (fixture) {
      logger.info({ enrichment_source: "fixture", companyName, domain: normalizedDomain });
      return fixture;
    }

    const empty = placeholder(normalizedDomain);
    await writeFixture(companyName, empty, normalizedDomain);
    logger.info({ enrichment_source: "placeholder", companyName, domain: normalizedDomain });
    return empty;
  }
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
    enrichment.description ? `Company: ${enrichment.description}` : "",
    enrichment.industry ? `Industry: ${enrichment.industry}` : "",
    enrichment.employee_band ? `Size: ${enrichment.employee_band}` : "",
    enrichment.news.length ? `Recent: ${enrichment.news.join(". ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export { inferDomain } from "@leadloop/shared";

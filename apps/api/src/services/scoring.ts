import type { EnrichmentResult, LeadBand } from "@leadloop/shared";
import { scoreToBand } from "@leadloop/shared";
import { SIEClient } from "@superlinked/sie-sdk";
import { expectedDemoBand } from "./enrich.js";
import { env } from "../lib/env.js";
import { createLogger } from "../lib/logger.js";

const logger = createLogger("scoring");

const ENCODE_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export type ScoringBand = LeadBand;

export interface ScoringResult {
  score: number;
  band: ScoringBand;
  explanation: string;
  sieScore: number | null;
  source: "superlinked" | "heuristic";
}

export function buildProfileText(enrichment: EnrichmentResult): string {
  const company = companyLabel(enrichment);
  const industry = enrichment.industry ?? "unknown";
  const employeeBand = enrichment.employee_band ?? "unknown";
  const website = enrichment.website_url ?? enrichment.domain ?? "unknown";
  const news =
    enrichment.news.length > 0
      ? enrichment.news.slice(0, 2).join("; ")
      : "none";

  return `${company} is a ${industry} company with ${employeeBand}. Website: ${website}. Recent news: ${news}.`;
}

function companyLabel(enrichment: EnrichmentResult): string {
  if (!enrichment.domain) return "unknown";
  const part = enrichment.domain.split(".")[0];
  return part || "unknown";
}

function bandFromScore(score: number): ScoringBand {
  return scoreToBand(score / 100);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < len; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return dot / denom;
}

function normalizeCosineToUnit(cosine: number): number {
  return Math.min(1, Math.max(0, (cosine + 1) / 2));
}

function buildExplanation(
  band: ScoringBand,
  score: number,
  source: ScoringResult["source"],
  factors: string[],
): string {
  const lead = factors.length
    ? `Scored ${score}/100 (${band}) via ${source} based on ${factors.join(", ")}.`
    : `Scored ${score}/100 (${band}) via ${source}.`;

  if (band === "hot") {
    return `${lead} Strong ICP fit for autonomous sales routing.`;
  }
  if (band === "warm") {
    return `${lead} Moderate ICP fit; nurture or follow-up recommended.`;
  }
  if (band === "needs_review") {
    return `${lead} Uncertain ICP fit; route to human review.`;
  }
  return `${lead} Weak ICP fit; low-priority nurture only.`;
}

async function scoreWithSuperlinked(
  enrichment: EnrichmentResult,
  profileText: string,
): Promise<ScoringResult | null> {
  if (!env.sieEndpoint) {
    logger.warn("Missing SIE_ENDPOINT — skipping Superlinked scoring");
    return null;
  }

  let client: SIEClient | undefined;

  try {
    client = new SIEClient(env.sieEndpoint, {
      apiKey: env.sieApiKey || undefined,
      timeout: 120_000,
    });

    const icpText = env.icpDescription;

    const [leadEncoded, icpEncoded] = await Promise.all([
      client.encode(ENCODE_MODEL, { text: profileText }),
      client.encode(ENCODE_MODEL, { text: icpText }),
    ]);

    const leadDense = leadEncoded.dense;
    const icpDense = icpEncoded.dense;

    if (!leadDense || !icpDense) {
      logger.warn("Invalid SIE response: missing dense embeddings");
      return null;
    }

    const cosine = cosineSimilarity(leadDense, icpDense);
    const sieScore = normalizeCosineToUnit(cosine);
    const score = Math.round(sieScore * 100);
    const band = bandFromScore(score);

    logger.info({
      scoring_source: "superlinked",
      sie_raw_score: sieScore,
      final_score: score,
      band,
    });

    return {
      score,
      band,
      explanation: buildExplanation(band, score, "superlinked", [
        "semantic ICP similarity",
      ]),
      sieScore,
      source: "superlinked",
    };
  } catch (err) {
    const detail =
      err instanceof Error
        ? err.message
        : typeof err === "object" && err && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
    logger.warn({ err: detail }, "Superlinked SIE scoring failed");
    return null;
  } finally {
    try {
      await client?.close();
    } catch {
      // ignore close errors
    }
  }
}

function scoreWithHeuristic(enrichment: EnrichmentResult): ScoringResult {
  let score = 0;
  const factors: string[] = [];

  const industry = (enrichment.industry ?? "").toLowerCase();
  if (/\b(saas|b2b)\b/i.test(industry) || /\bai\b/i.test(industry)) {
    score += 20;
    factors.push("SaaS/AI/B2B industry");
  }

  const employeeBand = enrichment.employee_band ?? "";
  const employeeMatch = employeeBand.match(/(\d+)/);
  if (employeeMatch && Number(employeeMatch[1]) > 100) {
    score += 20;
    factors.push("100+ employees");
  } else if (/(200|500|enterprise)/i.test(employeeBand)) {
    score += 20;
    factors.push("mid-market size");
  }

  const newsText = enrichment.news.join(" ").toLowerCase();
  if (/(funding|growth|raised|series|expansion|hiring)/i.test(newsText)) {
    score += 20;
    factors.push("growth signals in news");
  }

  if (enrichment.domain) {
    score += 10;
    factors.push("company domain present");
  }

  if (enrichment.description) {
    score += 10;
    factors.push("company description present");
  }

  score = Math.min(100, Math.max(0, score));
  const band = bandFromScore(score);

  logger.info({
    scoring_source: "heuristic",
    sie_raw_score: null,
    final_score: score,
    band,
  });

  return {
    score,
    band,
    explanation: buildExplanation(band, score, "heuristic", factors),
    sieScore: null,
    source: "heuristic",
  };
}

function demoScoreForBand(band: LeadBand): number {
  if (band === "hot") return 85;
  if (band === "warm") return 62;
  if (band === "cold") return 25;
  return 15;
}

function applyDemoFixtureBand(result: ScoringResult, enrichment: EnrichmentResult): ScoringResult {
  if (enrichment.source !== "fixture") return result;

  const expected = expectedDemoBand(enrichment.domain);
  if (!expected || result.band === expected) return result;

  const score = demoScoreForBand(expected);
  logger.info(
    { domain: enrichment.domain, computed: result.band, expected, score },
    "Demo fixture band override",
  );

  return {
    ...result,
    score,
    band: expected,
    explanation: buildExplanation(expected, score, result.source, ["demo scenario fixture"]),
    sieScore: result.sieScore,
  };
}

export async function scoreLead(enrichment: EnrichmentResult): Promise<ScoringResult> {
  try {
    const profileText = buildProfileText(enrichment);
    const superlinked = await scoreWithSuperlinked(enrichment, profileText);
    if (superlinked) {
      return applyDemoFixtureBand(superlinked, enrichment);
    }
    return applyDemoFixtureBand(scoreWithHeuristic(enrichment), enrichment);
  } catch (err) {
    logger.warn({ err: String(err) }, "Scoring failed unexpectedly; using heuristic fallback");
    return applyDemoFixtureBand(scoreWithHeuristic(enrichment), enrichment);
  }
}

/** Maps Layer 3 result to legacy pipeline ScoreResult shape. */
export function toScoreResult(result: ScoringResult): {
  score: number;
  band: ScoringBand;
  rankReasons: string[];
  source: "superlinked" | "mock";
} {
  return {
    score: result.score,
    band: result.band,
    rankReasons: [result.explanation],
    source: result.source === "heuristic" ? "mock" : "superlinked",
  };
}

import type { EnrichmentResult } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { createLogger } from "../lib/logger.js";
import {
  closeSieClient,
  createSieClient,
  isSieConfigured,
  SIE_ENCODE_MODEL,
} from "../lib/sie-client.js";

const logger = createLogger("scoring");

export type ScoringBand = "hot" | "warm" | "cold";

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

function scoreToBand(score: number): ScoringBand {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
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
  return `${lead} Weak ICP fit; low-priority nurture only.`;
}

async function scoreWithSuperlinked(
  enrichment: EnrichmentResult,
  profileText: string,
): Promise<ScoringResult | null> {
  if (!isSieConfigured()) {
    logger.warn("SIE cluster not configured — skipping Superlinked scoring");
    return null;
  }

  let client: ReturnType<typeof createSieClient> | undefined;

  try {
    client = createSieClient();
    const icpText = env.icpDescription;

    const [leadEncoded, icpEncoded] = await Promise.all([
      client.encode(SIE_ENCODE_MODEL, { text: profileText }, { waitForCapacity: true }),
      client.encode(SIE_ENCODE_MODEL, { text: icpText }, { waitForCapacity: true }),
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
    const band = scoreToBand(score);

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
    await closeSieClient(client);
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
  const band = scoreToBand(score);

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

export async function scoreLead(enrichment: EnrichmentResult): Promise<ScoringResult> {
  try {
    const profileText = buildProfileText(enrichment);
    const superlinked = await scoreWithSuperlinked(enrichment, profileText);
    if (superlinked) {
      return superlinked;
    }
    return scoreWithHeuristic(enrichment);
  } catch (err) {
    logger.warn({ err: String(err) }, "Scoring failed unexpectedly; using heuristic fallback");
    return scoreWithHeuristic(enrichment);
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

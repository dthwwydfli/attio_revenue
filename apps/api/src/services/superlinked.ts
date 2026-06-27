import type { ScoreResult } from "@leadloop/shared";
import { scoreToBand } from "@leadloop/shared";
import { env } from "../config.js";

export async function scoreLead(
  profileText: string,
  icpText?: string,
  source?: string,
): Promise<ScoreResult> {
  const icp = icpText ?? env.icpDescription;

  if (source === "demo_hot") {
    return {
      score: 92,
      band: "hot",
      rankReasons: [
        "B2B SaaS industry match",
        "Senior revenue leadership role",
        "Active evaluation signal with approved budget",
      ],
      source: "mock",
    };
  }
  if (source === "demo_warm") {
    return {
      score: 62,
      band: "warm",
      rankReasons: ["Partial ICP fit", "Sales leadership role", "Inbound interest signal"],
      source: "mock",
    };
  }
  if (source === "demo_cold") {
    return {
      score: 28,
      band: "cold",
      rankReasons: ["Retail industry", "Small company size", "Low CRM automation fit"],
      source: "mock",
    };
  }

  try {
    return await scoreWithSuperlinked(profileText, icp);
  } catch {
    return mockScore(profileText, icp);
  }
}

async function scoreWithSuperlinked(profileText: string, icpText: string): Promise<ScoreResult> {
  const res = await fetch(`${env.sieBaseUrl}/v1/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: env.sieRerankModel,
      query: { text: icpText },
      items: [{ text: profileText }],
    }),
  });

  if (!res.ok) {
    throw new Error(`SIE score failed: ${res.status}`);
  }

  const json = (await res.json()) as {
    scores?: Array<{ score?: number; rank?: number }>;
  };

  const rawScore = json.scores?.[0]?.score ?? -5;
  const normalized = sigmoidNormalize(rawScore);
  const band = scoreToBand(normalized);

  return {
    score: Math.round(normalized * 100),
    band,
    rankReasons: buildReasons(profileText, icpText, band),
    source: "superlinked",
  };
}

function sigmoidNormalize(logit: number): number {
  return 1 / (1 + Math.exp(-logit / 2));
}

function mockScore(profileText: string, icpText: string): ScoreResult {
  const profile = profileText.toLowerCase();
  const icp = icpText.toLowerCase();

  const icpTokens = icp.split(/\W+/).filter((t) => t.length > 3);
  const matches = icpTokens.filter((t) => profile.includes(t));
  const overlap = icpTokens.length ? matches.length / icpTokens.length : 0;

  let boost = 0;
  if (/vp|head of|director|revops|revenue|crm|saas|enterprise|budget|automation/i.test(profile)) {
    boost += 0.25;
  }
  if (/small|retail|local shop|owner/i.test(profile)) {
    boost -= 0.2;
  }

  const normalized = Math.min(1, Math.max(0, overlap * 0.6 + boost + 0.15));
  const band = scoreToBand(normalized);

  return {
    score: Math.round(normalized * 100),
    band,
    rankReasons: buildReasons(profileText, icpText, band),
    source: "mock",
  };
}

function buildReasons(profileText: string, icpText: string, band: string): string[] {
  const reasons: string[] = [];
  const p = profileText.toLowerCase();

  if (/saas|software|b2b/i.test(p)) reasons.push("B2B SaaS industry match");
  if (/vp|director|head of|revops|revenue/i.test(p)) reasons.push("Senior revenue leadership role");
  if (/50|100|200|500|employee/i.test(p)) reasons.push("Company size in ICP range");
  if (/crm|automation|agentic|attio/i.test(p)) reasons.push("Buying intent for CRM automation");
  if (/budget|evaluating|approved/i.test(p)) reasons.push("Active evaluation signal");

  if (reasons.length === 0) {
    reasons.push(`Semantic ICP comparison resulted in ${band} band`);
    reasons.push(`ICP focus: ${icpText.slice(0, 80)}...`);
  }

  return reasons.slice(0, 3);
}

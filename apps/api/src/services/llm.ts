import type { GeneratedAction, LeadInput, EnrichmentResult, ScoreResult } from "@leadloop/shared";
import { env } from "../config.js";

export async function generateAction(
  input: LeadInput,
  enrichment: EnrichmentResult,
  score: ScoreResult,
): Promise<GeneratedAction> {
  if (env.openaiApiKey) {
    try {
      return await generateWithOpenAI(input, enrichment, score);
    } catch {
      // fall through
    }
  }

  if (env.groqApiKey) {
    try {
      return await generateWithGroq(input, enrichment, score);
    } catch {
      // fall through
    }
  }

  return templateAction(input, enrichment, score);
}

async function generateWithOpenAI(
  input: LeadInput,
  enrichment: EnrichmentResult,
  score: ScoreResult,
): Promise<GeneratedAction> {
  const prompt = buildPrompt(input, enrichment, score);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a sales development agent. Return JSON only with keys: replySubject, replyBody, taskTitle, taskBody, shouldCallVoice, rationale.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");

  const parsed = JSON.parse(content) as Omit<GeneratedAction, "source">;
  return { ...parsed, source: "openai" };
}

async function generateWithGroq(
  input: LeadInput,
  enrichment: EnrichmentResult,
  score: ScoreResult,
): Promise<GeneratedAction> {
  const prompt = buildPrompt(input, enrichment, score);

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a sales development agent. Return JSON only with keys: replySubject, replyBody, taskTitle, taskBody, shouldCallVoice, rationale.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty Groq response");

  const parsed = JSON.parse(content) as Omit<GeneratedAction, "source">;
  return { ...parsed, source: "groq" };
}

function buildPrompt(
  input: LeadInput,
  enrichment: EnrichmentResult,
  score: ScoreResult,
): string {
  return JSON.stringify({
    lead: input,
    enrichment,
    score,
    instructions: {
      hot: "Draft urgent personalized reply, create high-priority task, set shouldCallVoice true if phone present",
      warm: "Draft friendly reply and follow-up task, shouldCallVoice false",
      cold: "Brief nurture reply, minimal task, shouldCallVoice false",
      needs_review: "Flag for human review with task, shouldCallVoice false",
    }[score.band],
  });
}

function templateAction(
  input: LeadInput,
  enrichment: EnrichmentResult,
  score: ScoreResult,
): GeneratedAction {
  const firstName = input.name.split(" ")[0];

  const templates: Record<ScoreResult["band"], GeneratedAction> = {
    hot: {
      replySubject: `Re: ${input.company} + LeadLoop — let's talk this week`,
      replyBody: `Hi ${firstName},\n\nThanks for reaching out about agentic CRM for ${input.company}. Based on your ${input.role ?? "role"} and ${enrichment.industry ?? "company"} focus, I'd love to show how LeadLoop routes inbound leads autonomously into Attio with scoring and voice follow-up.\n\nAre you free for 20 minutes this week?\n\nBest,\nLeadLoop Agent`,
      taskTitle: `[HOT] Book demo with ${input.name}`,
      taskBody: `Score ${score.score}/100. ${score.rankReasons.join(". ")}. Reply drafted — prioritize outreach.`,
      shouldCallVoice: Boolean(input.phone),
      rationale: `Hot lead (${score.score}/100): strong ICP match for ${enrichment.industry ?? "unknown industry"}, ${enrichment.employee_band ?? "unknown size"}.`,
      source: "template",
    },
    warm: {
      replySubject: `Thanks for your interest, ${firstName}`,
      replyBody: `Hi ${firstName},\n\nAppreciate you contacting us from ${input.company}. We help revenue teams automate inbound routing with Attio as the source of truth.\n\nI'll share a quick overview — would a brief call next week work?\n\nBest,\nLeadLoop Agent`,
      taskTitle: `[WARM] Follow up with ${input.name}`,
      taskBody: `Score ${score.score}/100. Send overview and schedule call.`,
      shouldCallVoice: false,
      rationale: `Warm lead (${score.score}/100): partial ICP fit, worth nurturing.`,
      source: "template",
    },
    cold: {
      replySubject: `Thanks for reaching out`,
      replyBody: `Hi ${firstName},\n\nThanks for your message. LeadLoop is built for B2B teams automating inbound sales — I'll keep you on our nurture list.\n\nBest,\nLeadLoop Agent`,
      taskTitle: undefined,
      taskBody: undefined,
      shouldCallVoice: false,
      rationale: `Cold lead (${score.score}/100): low ICP fit, nurture only.`,
      source: "template",
    },
    needs_review: {
      replySubject: `We're reviewing your inquiry`,
      replyBody: `Hi ${firstName},\n\nThanks for contacting us. Our team is reviewing your inquiry and will follow up shortly.\n\nBest,\nLeadLoop Agent`,
      taskTitle: `[REVIEW] Manual review: ${input.name}`,
      taskBody: `Score ${score.score}/100 — ambiguous ICP match. Human review required.`,
      shouldCallVoice: false,
      rationale: `Needs review (${score.score}/100): insufficient signals for autonomous routing.`,
      source: "template",
    },
  };

  return templates[score.band];
}

import type { EnrichmentResult, GeneratedAction, LeadInput } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { createLogger } from "../lib/logger.js";
import {
  closeSieClient,
  createSieClient,
  ensureWarmLlmLane,
  getWarmLlmRoute,
  isSieConfigured,
  SIE_WARM_LLM_MODEL,
} from "../lib/sie-client.js";
import type { ScoringResult } from "./scoring.js";

const logger = createLogger("llm");

const SIE_LLM_MODEL = env.sieLlmModel;
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-haiku-20240307";

const GEMINI_MODEL = env.geminiModel;

export type LLMSource = "gemini" | "sie" | "openai" | "anthropic" | "fallback";

export interface LeadContext {
  lead: LeadInput;
  enrichment: EnrichmentResult;
  scoring: ScoringResult;
}

export interface LLMEmailResult {
  subject: string;
  body: string;
  tone: "casual" | "professional";
  confidence: number;
  source: LLMSource;
}

export interface LLMSummaryResult {
  headline: string;
  bullets: string[];
  confidence: number;
  source: LLMSource;
}

export interface LLMCallScriptResult {
  opening: string;
  pitch: string;
  objectionHandlers: string[];
  close: string;
  confidence: number;
  source: LLMSource;
}

export interface LLMRoutingResult {
  action: "route_to_sdr" | "nurture" | "review" | "voice_call";
  priority: "high" | "medium" | "low";
  ownerHint: string;
  shouldCallVoice: boolean;
  taskTitle?: string;
  taskBody?: string;
  rationale: string;
  confidence: number;
  source: LLMSource;
}

export interface LLMNotesResult {
  notes: string;
  tags: string[];
  confidence: number;
  source: LLMSource;
}

interface LLMCallMeta {
  source: LLMSource;
  promptTokens?: number;
  outputTokens?: number;
  fallbackUsed: boolean;
}

function safe(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") return "unknown";
  return value.trim();
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "there";
}

function isPlaceholderKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  return !k || k.includes("placeholder") || k === "sk-dev-placeholder";
}

function hasSieLlm(): boolean {
  return isSieConfigured();
}

function hasOpenAI(): boolean {
  return Boolean(env.openaiApiKey) && !isPlaceholderKey(env.openaiApiKey);
}

function hasGemini(): boolean {
  return Boolean(env.geminiApiKey) && !isPlaceholderKey(env.geminiApiKey);
}

function hasAnthropic(): boolean {
  return Boolean(env.anthropicApiKey) && !isPlaceholderKey(env.anthropicApiKey);
}

function toneForBand(band: ScoringResult["band"]): "casual" | "professional" {
  return band === "cold" ? "casual" : "professional";
}

function confidenceForSource(source: LLMSource): number {
  if (source === "fallback") return 0.55;
  return 0.85;
}

function buildFactsBlock(ctx: LeadContext): string {
  const { lead, enrichment, scoring } = ctx;
  const news =
    enrichment.news.length > 0 ? enrichment.news.slice(0, 3).join(" | ") : "unknown";

  return [
    "FACTS (use only these; do not invent):",
    `- lead.name: ${safe(lead.name)}`,
    `- lead.email: ${safe(lead.email)}`,
    `- lead.company: ${safe(lead.company)}`,
    `- lead.role: ${safe(lead.role)}`,
    `- lead.message: ${safe(lead.message)}`,
    `- lead.phone: ${safe(lead.phone)}`,
    `- lead.source: ${safe(lead.source)}`,
    `- enrichment.description: ${safe(enrichment.description)}`,
    `- enrichment.industry: ${safe(enrichment.industry)}`,
    `- enrichment.employee_band: ${safe(enrichment.employee_band)}`,
    `- enrichment.website_url: ${safe(enrichment.website_url)}`,
    `- enrichment.domain: ${safe(enrichment.domain)}`,
    `- enrichment.news: ${news}`,
    `- scoring.band: ${scoring.band}`,
    `- scoring.score: ${scoring.score}`,
    `- scoring.explanation: ${safe(scoring.explanation)}`,
    `- scoring.source: ${scoring.source}`,
  ].join("\n");
}

function buildPrompt(ctx: LeadContext, task: string, jsonShape: string): string {
  return [
    "You are LeadLoop's deterministic SDR action agent.",
    "Rules:",
    "- Use ONLY the provided facts.",
    "- Do not invent companies, people, metrics, or products not in facts.",
    "- If a field is unknown, say unknown or omit it.",
    "- Output MUST be a single raw JSON object matching the schema. No markdown fences, no bullet lists, no extra keys.",
    `Task: ${task}`,
    `JSON schema: ${jsonShape}`,
    buildFactsBlock(ctx),
    "Respond with JSON only:",
  ].join("\n\n");
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1));
    }
    return JSON.parse(candidate);
  } catch {
    // Qwen sometimes emits multiple JSON objects — use the last parseable one.
    const objects: unknown[] = [];
    let depth = 0;
    let start = -1;

    for (let i = 0; i < candidate.length; i++) {
      const ch = candidate[i];
      if (ch === "{") {
        if (depth === 0) start = i;
        depth += 1;
      } else if (ch === "}") {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          const slice = candidate.slice(start, i + 1);
          try {
            objects.push(JSON.parse(slice));
          } catch {
            // skip malformed chunk
          }
          start = -1;
        }
      }
    }

    if (objects.length > 0) {
      return objects[objects.length - 1];
    }

    throw new Error("No parseable JSON in LLM response");
  }
}

function logLLM(meta: LLMCallMeta, detail?: string): void {
  logger.info({
    llm_provider: meta.source,
    prompt_tokens: meta.promptTokens ?? null,
    output_tokens: meta.outputTokens ?? null,
    fallback_used: meta.fallbackUsed,
    ...(detail ? { detail } : {}),
  });
}

async function callSie(
  prompt: string,
  maxNewTokens = 2048,
  jsonShape?: string,
): Promise<{ text: string; promptTokens?: number; outputTokens?: number } | null> {
  if (!hasSieLlm()) {
    logger.warn("SIE LLM skipped — missing SIE_ENDPOINT or SIE_API_KEY");
    return null;
  }

  const userPrompt = jsonShape
    ? [
        "Return ONLY one valid JSON object matching the schema below.",
        `Schema: ${jsonShape}`,
        "Do not use markdown, bullet lists, or commentary.",
        "",
        prompt,
      ].join("\n")
    : prompt;

  let client: ReturnType<typeof createSieClient> | undefined;
  try {
    await ensureWarmLlmLane();
    const warm = getWarmLlmRoute();
    const attempts = [
      warm,
      ...(warm.model !== SIE_WARM_LLM_MODEL
        ? [{ model: SIE_WARM_LLM_MODEL, gpu: warm.gpu }]
        : []),
    ];

    for (const attempt of attempts) {
      client = createSieClient({ gpu: attempt.gpu });
      try {
        const result = await client.generate(attempt.model, userPrompt, {
          maxNewTokens,
          temperature: 0,
          gpu: attempt.gpu,
          waitForCapacity: true,
        });
        const usage = result.usage;
        return {
          text: result.text,
          promptTokens: usage?.promptTokens,
          outputTokens: usage?.completionTokens,
        };
      } catch (err) {
        logger.warn(
          {
            err: err instanceof Error ? err.message : String(err),
            model: attempt.model,
            gpu: attempt.gpu,
          },
          "SIE LLM generation attempt failed",
        );
      } finally {
        await closeSieClient(client);
        client = undefined;
      }
    }

    return null;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "SIE LLM generation failed",
    );
    return null;
  } finally {
    await closeSieClient(client);
  }
}

async function callOpenAI(
  prompt: string,
  maxTokens = 256,
): Promise<{ text: string; promptTokens?: number; outputTokens?: number } | null> {
  if (!hasOpenAI()) {
    logger.warn("OpenAI skipped — missing or placeholder OPENAI_API_KEY");
    return null;
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Return valid JSON only. Use only facts from the user message. Do not hallucinate.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "OpenAI LLM request failed");
      return null;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content;
    if (!text) {
      logger.warn("OpenAI returned empty content");
      return null;
    }
    return {
      text,
      promptTokens: json.usage?.prompt_tokens,
      outputTokens: json.usage?.completion_tokens,
    };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "OpenAI LLM error");
    return null;
  }
}

async function callGemini(
  prompt: string,
  maxTokens = 1024,
  responseSchema?: Record<string, unknown>,
): Promise<{ text: string; promptTokens?: number; outputTokens?: number } | null> {
  if (!hasGemini()) {
    logger.warn("Gemini skipped — missing or placeholder GEMINI_API_KEY");
    return null;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: maxTokens,
          responseMimeType: "application/json",
          ...(responseSchema ? { responseSchema } : {}),
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      logger.warn({ status: res.status, body: errText.slice(0, 200) }, "Gemini LLM request failed");
      return null;
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      logger.warn("Gemini returned empty content");
      return null;
    }
    return {
      text,
      promptTokens: json.usageMetadata?.promptTokenCount,
      outputTokens: json.usageMetadata?.candidatesTokenCount,
    };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Gemini LLM error");
    return null;
  }
}

async function callAnthropic(
  prompt: string,
  maxTokens = 256,
): Promise<{ text: string; promptTokens?: number; outputTokens?: number } | null> {
  if (!hasAnthropic()) {
    logger.warn("Anthropic skipped — missing or placeholder ANTHROPIC_API_KEY");
    return null;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        temperature: 0,
        system:
          "Return valid JSON only. Use only facts from the user message. Do not hallucinate.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "Anthropic LLM request failed");
      return null;
    }

    const json = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = json.content?.find((c) => c.type === "text")?.text;
    if (!text) {
      logger.warn("Anthropic returned empty content");
      return null;
    }
    return {
      text,
      promptTokens: json.usage?.input_tokens,
      outputTokens: json.usage?.output_tokens,
    };
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Anthropic LLM error");
    return null;
  }
}

async function completeJson(
  ctx: LeadContext,
  task: string,
  jsonShape: string,
  geminiSchema?: Record<string, unknown>,
): Promise<{ raw: unknown; meta: LLMCallMeta } | null> {
  const prompt = buildPrompt(ctx, task, jsonShape);

  if (hasSieLlm()) {
    const sie = await callSie(prompt, 2048, jsonShape);
    if (sie) {
      try {
        return {
          raw: extractJson(sie.text),
          meta: {
            source: "sie",
            promptTokens: sie.promptTokens,
            outputTokens: sie.outputTokens,
            fallbackUsed: false,
          },
        };
      } catch {
        logger.warn({ raw: sie.text.slice(0, 400) }, "Invalid JSON from SIE LLM");
      }
    }
  }

  if (hasGemini()) {
    const gemini = await callGemini(prompt, 2048, geminiSchema);
    if (gemini) {
      try {
        return {
          raw: extractJson(gemini.text),
          meta: {
            source: "gemini",
            promptTokens: gemini.promptTokens,
            outputTokens: gemini.outputTokens,
            fallbackUsed: hasSieLlm(),
          },
        };
      } catch {
        logger.warn({ raw: gemini.text.slice(0, 400) }, "Invalid JSON from Gemini");
      }
    }
  }

  const openai = await callOpenAI(prompt);
  if (openai) {
    try {
      return {
        raw: extractJson(openai.text),
        meta: {
          source: "openai",
          promptTokens: openai.promptTokens,
          outputTokens: openai.outputTokens,
          fallbackUsed: false,
        },
      };
    } catch {
      logger.warn("Invalid JSON from OpenAI");
    }
  }

  const anthropic = await callAnthropic(prompt);
  if (anthropic) {
    try {
      return {
        raw: extractJson(anthropic.text),
        meta: {
          source: "anthropic",
          promptTokens: anthropic.promptTokens,
          outputTokens: anthropic.outputTokens,
          fallbackUsed: false,
        },
      };
    } catch {
      logger.warn("Invalid JSON from Anthropic");
    }
  }

  return null;
}

function fallbackEmail(ctx: LeadContext): LLMEmailResult {
  const { lead, enrichment, scoring } = ctx;
  const name = firstName(lead.name);
  const tone = toneForBand(scoring.band);

  const byBand: Record<ScoringResult["band"], LLMEmailResult> = {
    hot: {
      subject: `Re: ${safe(lead.company)} + LeadLoop`,
      body: `Hi ${name},\n\nThanks for reaching out from ${safe(lead.company)}. Based on your ${safe(lead.role)} role and ${safe(enrichment.industry)} focus (${scoring.explanation}), I'd like to show how LeadLoop routes inbound leads into Attio with scoring and voice follow-up.\n\nAre you free for 20 minutes this week?\n\nBest,\nLeadLoop Agent`,
      tone: "professional",
      confidence: 0.55,
      source: "fallback",
    },
    warm: {
      subject: `Thanks for your interest, ${name}`,
      body: `Hi ${name},\n\nThanks for contacting us from ${safe(lead.company)}. We help revenue teams automate inbound routing with Attio as the source of truth.\n\n${scoring.explanation}\n\nWould a brief call next week work?\n\nBest,\nLeadLoop Agent`,
      tone: "professional",
      confidence: 0.55,
      source: "fallback",
    },
    cold: {
      subject: "Thanks for reaching out",
      body: `Hi ${name},\n\nThanks for your message. LeadLoop is built for B2B inbound sales automation — I'll keep you on our nurture list.\n\nBest,\nLeadLoop Agent`,
      tone: "casual",
      confidence: 0.55,
      source: "fallback",
    },
  };

  return byBand[scoring.band];
}

function fallbackSummary(ctx: LeadContext): LLMSummaryResult {
  const { lead, enrichment, scoring } = ctx;
  return {
    headline: `${safe(lead.name)} @ ${safe(lead.company)} — ${scoring.band} lead (${scoring.score}/100)`,
    bullets: [
      `Role: ${safe(lead.role)}`,
      `Industry: ${safe(enrichment.industry)} | Size: ${safe(enrichment.employee_band)}`,
      `Website: ${safe(enrichment.website_url)}`,
      scoring.explanation,
      lead.message ? `Inbound message: ${safe(lead.message)}` : "Inbound message: unknown",
    ].filter((b) => b !== "Inbound message: unknown" || scoring.band !== "cold"),
    confidence: 0.55,
    source: "fallback",
  };
}

function fallbackCallScript(ctx: LeadContext): LLMCallScriptResult {
  const { lead, enrichment, scoring } = ctx;
  const name = firstName(lead.name);
  return {
    opening: `Hi ${name}, this is LeadLoop calling about your inquiry from ${safe(lead.company)}.`,
    pitch: `We help ${safe(enrichment.industry)} teams route inbound leads into Attio with autonomous scoring. Your lead scored ${scoring.score}/100 (${scoring.band}).`,
    objectionHandlers: [
      "If timing is tight: we can start with a 15-minute workflow review.",
      "If Attio setup is a concern: we write back notes, tasks, and scores automatically.",
    ],
    close: "Would Tuesday or Thursday work for a short demo?",
    confidence: 0.55,
    source: "fallback",
  };
}

function fallbackRouting(ctx: LeadContext): LLMRoutingResult {
  const { lead, scoring } = ctx;
  const hot = scoring.band === "hot";
  const warm = scoring.band === "warm";

  return {
    action: hot && lead.phone ? "voice_call" : hot ? "route_to_sdr" : warm ? "nurture" : "nurture",
    priority: hot ? "high" : warm ? "medium" : "low",
    ownerHint: hot ? "senior_sdr" : warm ? "sdr_pool" : "nurture_queue",
    shouldCallVoice: hot && Boolean(lead.phone),
    taskTitle: hot
      ? `[HOT] Book demo with ${safe(lead.name)}`
      : warm
        ? `[WARM] Follow up with ${safe(lead.name)}`
        : undefined,
    taskBody: hot || warm ? `${scoring.score}/100 — ${scoring.explanation}` : undefined,
    rationale: scoring.explanation,
    confidence: 0.55,
    source: "fallback",
  };
}

function fallbackNotes(ctx: LeadContext): LLMNotesResult {
  const { lead, enrichment, scoring } = ctx;
  return {
    notes: [
      `## ${safe(lead.name)} — ${scoring.band.toUpperCase()} (${scoring.score}/100)`,
      "",
      `- Company: ${safe(lead.company)} (${safe(enrichment.industry)}, ${safe(enrichment.employee_band)})`,
      `- Role: ${safe(lead.role)}`,
      `- Score source: ${scoring.source}`,
      `- ${scoring.explanation}`,
      lead.message ? `- Message: ${safe(lead.message)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    tags: [scoring.band, safe(enrichment.industry).toLowerCase(), scoring.source],
    confidence: 0.55,
    source: "fallback",
  };
}

export async function generateEmailReply(input: LeadContext): Promise<LLMEmailResult> {
  try {
    const jsonShape =
      '{"subject":"string","body":"string","tone":"casual|professional"}';
    const result = await completeJson(
      input,
      "Write a personalised SDR email reply using only provided facts.",
      jsonShape,
      {
        type: "OBJECT",
        properties: {
          subject: { type: "STRING" },
          body: { type: "STRING" },
          tone: { type: "STRING", enum: ["casual", "professional"] },
        },
        required: ["subject", "body", "tone"],
      },
    );

    if (result) {
      const raw = result.raw as Record<string, unknown>;
      const subject = typeof raw.subject === "string" ? raw.subject : "";
      const body = typeof raw.body === "string" ? raw.body : "";
      const tone = raw.tone === "casual" || raw.tone === "professional" ? raw.tone : toneForBand(input.scoring.band);

      if (subject && body) {
        const out: LLMEmailResult = {
          subject,
          body,
          tone,
          confidence: confidenceForSource(result.meta.source),
          source: result.meta.source,
        };
        logLLM(result.meta);
        return out;
      }
      logger.warn("Invalid email JSON shape from LLM");
    }

    const fallback = fallbackEmail(input);
    logLLM({ source: "fallback", fallbackUsed: true }, "email template fallback");
    return fallback;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "generateEmailReply failed");
    return fallbackEmail(input);
  }
}

export async function generateLeadSummary(input: LeadContext): Promise<LLMSummaryResult> {
  try {
    const jsonShape = '{"headline":"string","bullets":["string"]}';
    const result = await completeJson(
      input,
      "Summarise this lead for an SDR handoff using only provided facts.",
      jsonShape,
      {
        type: "OBJECT",
        properties: {
          headline: { type: "STRING" },
          bullets: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["headline", "bullets"],
      },
    );

    if (result) {
      const raw = result.raw as Record<string, unknown>;
      const headline = typeof raw.headline === "string" ? raw.headline : "";
      const bullets = Array.isArray(raw.bullets)
        ? raw.bullets.filter((b): b is string => typeof b === "string")
        : [];

      if (headline && bullets.length > 0) {
        const out: LLMSummaryResult = {
          headline,
          bullets,
          confidence: confidenceForSource(result.meta.source),
          source: result.meta.source,
        };
        logLLM(result.meta);
        return out;
      }
      logger.warn("Invalid summary JSON shape from LLM");
    }

    const fallback = fallbackSummary(input);
    logLLM({ source: "fallback", fallbackUsed: true }, "summary template fallback");
    return fallback;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "generateLeadSummary failed");
    return fallbackSummary(input);
  }
}

export async function generateCallScript(input: LeadContext): Promise<LLMCallScriptResult> {
  try {
    const jsonShape =
      '{"opening":"string","pitch":"string","objectionHandlers":["string"],"close":"string"}';
    const result = await completeJson(
      input,
      "Write a short outbound call script for an SDR using only provided facts.",
      jsonShape,
      {
        type: "OBJECT",
        properties: {
          opening: { type: "STRING" },
          pitch: { type: "STRING" },
          objectionHandlers: { type: "ARRAY", items: { type: "STRING" } },
          close: { type: "STRING" },
        },
        required: ["opening", "pitch", "objectionHandlers", "close"],
      },
    );

    if (result) {
      const raw = result.raw as Record<string, unknown>;
      const opening = typeof raw.opening === "string" ? raw.opening : "";
      const pitch = typeof raw.pitch === "string" ? raw.pitch : "";
      const objectionHandlers = Array.isArray(raw.objectionHandlers)
        ? raw.objectionHandlers.filter((b): b is string => typeof b === "string")
        : [];
      const close = typeof raw.close === "string" ? raw.close : "";

      if (opening && pitch && close) {
        const out: LLMCallScriptResult = {
          opening,
          pitch,
          objectionHandlers,
          close,
          confidence: confidenceForSource(result.meta.source),
          source: result.meta.source,
        };
        logLLM(result.meta);
        return out;
      }
      logger.warn("Invalid call script JSON shape from LLM");
    }

    const fallback = fallbackCallScript(input);
    logLLM({ source: "fallback", fallbackUsed: true }, "call script template fallback");
    return fallback;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "generateCallScript failed");
    return fallbackCallScript(input);
  }
}

export async function generateRoutingDecision(input: LeadContext): Promise<LLMRoutingResult> {
  try {
    const jsonShape =
      '{"action":"route_to_sdr|nurture|review|voice_call","priority":"high|medium|low","ownerHint":"string","shouldCallVoice":boolean,"taskTitle":"string|null","taskBody":"string|null","rationale":"string"}';
    const result = await completeJson(
      input,
      "Decide routing for this inbound lead using scoring.band and facts only.",
      jsonShape,
      {
        type: "OBJECT",
        properties: {
          action: {
            type: "STRING",
            enum: ["route_to_sdr", "nurture", "review", "voice_call"],
          },
          priority: { type: "STRING", enum: ["high", "medium", "low"] },
          ownerHint: { type: "STRING" },
          shouldCallVoice: { type: "BOOLEAN" },
          rationale: { type: "STRING" },
        },
        required: ["action", "priority", "ownerHint", "shouldCallVoice", "rationale"],
      },
    );

    if (result) {
      const raw = result.raw as Record<string, unknown>;
      const action = raw.action;
      const priority = raw.priority;
      const ownerHint = typeof raw.ownerHint === "string" ? raw.ownerHint : "";
      const rationale = typeof raw.rationale === "string" ? raw.rationale : "";
      const shouldCallVoice = raw.shouldCallVoice === true;
      const taskTitle =
        typeof raw.taskTitle === "string" ? raw.taskTitle : undefined;
      const taskBody = typeof raw.taskBody === "string" ? raw.taskBody : undefined;

      const validAction =
        action === "route_to_sdr" ||
        action === "nurture" ||
        action === "review" ||
        action === "voice_call";
      const validPriority =
        priority === "high" || priority === "medium" || priority === "low";

      if (validAction && validPriority && ownerHint && rationale) {
        const hot = input.scoring.band === "hot";
        const warm = input.scoring.band === "warm";
        const out: LLMRoutingResult = {
          action,
          priority,
          ownerHint,
          shouldCallVoice,
          taskTitle:
            typeof raw.taskTitle === "string"
              ? raw.taskTitle
              : hot
                ? `[HOT] Book demo with ${safe(input.lead.name)}`
                : warm
                  ? `[WARM] Follow up with ${safe(input.lead.name)}`
                  : undefined,
          taskBody:
            typeof raw.taskBody === "string"
              ? raw.taskBody
              : hot || warm
                ? `${input.scoring.score}/100 — ${input.scoring.explanation}`
                : undefined,
          rationale,
          confidence: confidenceForSource(result.meta.source),
          source: result.meta.source,
        };
        logLLM(result.meta);
        return out;
      }
      logger.warn("Invalid routing JSON shape from LLM");
    }

    const fallback = fallbackRouting(input);
    logLLM({ source: "fallback", fallbackUsed: true }, "routing template fallback");
    return fallback;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "generateRoutingDecision failed");
    return fallbackRouting(input);
  }
}

export async function generateAgentNotes(input: LeadContext): Promise<LLMNotesResult> {
  try {
    const jsonShape = '{"notes":"string","tags":["string"]}';
    const result = await completeJson(
      input,
      "Write concise agent notes for Attio using only provided facts.",
      jsonShape,
      {
        type: "OBJECT",
        properties: {
          notes: { type: "STRING" },
          tags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["notes", "tags"],
      },
    );

    if (result) {
      const raw = result.raw as Record<string, unknown>;
      const notes = typeof raw.notes === "string" ? raw.notes : "";
      const tags = Array.isArray(raw.tags)
        ? raw.tags.filter((t): t is string => typeof t === "string")
        : [];

      if (notes) {
        const out: LLMNotesResult = {
          notes,
          tags,
          confidence: confidenceForSource(result.meta.source),
          source: result.meta.source,
        };
        logLLM(result.meta);
        return out;
      }
      logger.warn("Invalid notes JSON shape from LLM");
    }

    const fallback = fallbackNotes(input);
    logLLM({ source: "fallback", fallbackUsed: true }, "notes template fallback");
    return fallback;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "generateAgentNotes failed");
    return fallbackNotes(input);
  }
}

/** Pipeline adapter — composes Layer 4 outputs into legacy GeneratedAction shape. */
export async function generateAction(
  lead: LeadInput,
  enrichment: EnrichmentResult,
  scoring: ScoringResult,
): Promise<GeneratedAction> {
  const ctx: LeadContext = { lead, enrichment, scoring };

  const [email, routing, notes] = await Promise.all([
    generateEmailReply(ctx),
    generateRoutingDecision(ctx),
    generateAgentNotes(ctx),
  ]);

  const source: GeneratedAction["source"] =
    email.source === "fallback"
      ? "fallback"
      : email.source === "sie"
        ? "sie"
        : email.source === "gemini"
          ? "gemini"
          : email.source === "anthropic"
            ? "anthropic"
            : "openai";

  return {
    replySubject: email.subject,
    replyBody: email.body,
    taskTitle: routing.taskTitle,
    taskBody: routing.taskBody ?? notes.notes,
    shouldCallVoice: routing.shouldCallVoice,
    rationale: routing.rationale,
    source,
  };
}

import type { LeadRun } from "@leadloop/shared";
import { env } from "../lib/env.js";
import { isSlngApiKeyConfigured } from "../lib/slng-client.js";

const SLNG_TTS_URL = "https://api.slng.ai/v1/tts/slng/rime/arcana:3-en";

export function buildBrowserVoiceGreeting(run: LeadRun): string {
  const first = run.input.name.split(" ")[0] ?? run.input.name;
  const role = run.input.role ? ` I see you're ${run.input.role}.` : "";
  return (
    `Hi ${first}, thanks for reaching out about ${run.input.company}.${role} ` +
    `We help RevOps and sales leaders automate inbound CRM routing with Attio. ` +
    `What's your team size and timeline for CRM automation?`
  );
}

export async function replyBrowserVoice(run: LeadRun, userMessage: string): Promise<string> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return "I didn't catch that — could you repeat your team size or timeline?";
  }

  if (!env.geminiApiKey || env.geminiApiKey.includes("placeholder")) {
    return (
      `Thanks — based on "${trimmed.slice(0, 100)}", LeadLoop can help ${run.input.company} ` +
      `route inbound leads into Attio against your ICP. Would a 15-minute demo this week work?`
    );
  }

  const prompt = [
    "You are a concise inbound SDR for LeadLoop, an autonomous lead router for Attio CRM.",
    `ICP: ${env.icpDescription}`,
    `Lead: ${run.input.name} at ${run.input.company}${run.input.role ? ` (${run.input.role})` : ""}.`,
    run.enrichment?.employee_band ? `Company size band: ${run.enrichment.employee_band}.` : "",
    run.enrichment?.industry ? `Industry: ${run.enrichment.industry}.` : "",
    `The prospect just said: "${trimmed}"`,
    "Reply in one or two spoken sentences. Relate to ICP fit and suggest next step.",
  ]
    .filter(Boolean)
    .join(" ");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
      }),
    },
  );

  if (!res.ok) {
    return (
      `Thanks for sharing. LeadLoop can automate inbound routing for ${run.input.company} in Attio. ` +
      `Would you like to book a quick demo?`
    );
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || `Great — let's find time for a demo with ${run.input.company}.`;
}

export function isSlngCreditError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("402") || lower.includes("insufficient credit") || lower.includes("top up");
}

export async function synthesizeBrowserVoiceTts(text: string): Promise<string | null> {
  if (!isSlngApiKeyConfigured() || !text.trim()) return null;

  const res = await fetch(SLNG_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.slngApiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({ text: text.slice(0, 500), speaker: "astra" }),
  });

  if (!res.ok) return null;

  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.byteLength === 0) return null;
  return bytes.toString("base64");
}

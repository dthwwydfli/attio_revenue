import type { DemoScenario, LeadRun } from "@leadloop/shared";
import { DEMO_LEADS } from "@leadloop/shared";

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function buildEvents(
  steps: Array<{ step: LeadRun["currentStep"]; status: "completed" | "skipped"; message?: string; offsetMin: number }>,
): LeadRun["events"] {
  return steps.map((s) => ({
    step: s.step,
    status: s.status,
    message: s.message,
    timestamp: minutesAgo(s.offsetMin),
    durationMs: Math.floor(Math.random() * 400) + 120,
  }));
}

const HOT_RUN: LeadRun = {
  id: "demo-hot",
  status: "completed",
  currentStep: "completed",
  input: DEMO_LEADS.hot,
  enrichment: {
    domain: "acmecorp.io",
    description: "Acme Corp builds enterprise workflow automation tools for revenue teams.",
    industry: "B2B SaaS",
    employee_band: "200-500 employees",
    website_url: "https://acmecorp.io",
    linkedin_url: "https://linkedin.com/company/acme-corp",
    news: [
      "Raised Series B to expand enterprise CRM automation",
      "Launched AI-powered sales routing module",
    ],
    source: "fixture",
  },
  score: {
    score: 92,
    band: "hot",
    rankReasons: [
      "B2B SaaS industry match",
      "Senior revenue leadership role",
      "Active evaluation signal with approved budget",
    ],
    source: "mock",
  },
  action: {
    replySubject: "Re: Acme Corp + LeadLoop: let's talk this week",
    replyBody:
      "Hi Sarah,\n\nThanks for reaching out about agentic CRM for Acme Corp. Based on your VP Revenue Operations role and B2B SaaS focus, I'd love to show how LeadLoop routes inbound leads autonomously into Attio with scoring and voice follow-up.\n\nAre you free for 20 minutes this week?\n\nBest,\nLeadLoop Agent",
    taskTitle: "[HOT] Book demo with Sarah Chen",
    taskBody:
      "Score 92/100. B2B SaaS industry match. Senior revenue leadership role. Reply drafted. Prioritise outreach.",
    shouldCallVoice: true,
    rationale:
      "Hot lead (92/100): strong ICP match for B2B SaaS, 200-500 employees.",
    source: "template",
  },
  slng: {
    status: "web_session_started",
    callId: "mock-demo-hot",
    transcriptSnippet:
      "[Demo mode] SLNG voice agent would engage Sarah Chen at Acme Corp with a personalised pitch. Add SLNG_API_KEY and SLNG_AGENT_ID for a live session.",
  },
  attio: {
    personRecordId: "attio_person_sarah_chen",
    companyRecordId: "attio_company_acme",
    noteId: "attio_note_hot_001",
    taskId: "attio_task_hot_001",
    personUrl: "https://app.attio.com/demo/person/sarah-chen",
    companyUrl: "https://app.attio.com/demo/company/acme-corp",
    skipped: false,
  },
  events: buildEvents([
    { step: "received", status: "completed", message: "Lead received", offsetMin: 4 },
    { step: "attio_upsert", status: "completed", message: "Person: attio_person_sarah_chen", offsetMin: 3.8 },
    { step: "enriched", status: "completed", message: "fixture", offsetMin: 3.5 },
    { step: "scored", status: "completed", message: "hot (92) via mock", offsetMin: 3.2 },
    { step: "action_generated", status: "completed", message: "template", offsetMin: 2.8 },
    { step: "voice", status: "completed", message: "web_session_started", offsetMin: 2.2 },
    { step: "attio_writeback", status: "completed", message: "Note attio_note_hot_001", offsetMin: 1.5 },
    { step: "completed", status: "completed", message: "Pipeline complete", offsetMin: 1 },
  ]),
  createdAt: minutesAgo(4),
  updatedAt: minutesAgo(1),
};

const WARM_RUN: LeadRun = {
  id: "demo-warm",
  status: "completed",
  currentStep: "completed",
  input: DEMO_LEADS.warm,
  enrichment: {
    domain: "midmarket.io",
    description: "MidMarket Solutions sells sales enablement software to SMB sales teams.",
    industry: "Sales Tech",
    employee_band: "50-100 employees",
    website_url: "https://midmarket.io",
    linkedin_url: "https://linkedin.com/company/midmarket-solutions",
    news: ["MidMarket Solutions hiring SDRs for inbound pipeline"],
    source: "fixture",
  },
  score: {
    score: 62,
    band: "warm",
    rankReasons: ["Partial ICP fit", "Sales leadership role", "Inbound interest signal"],
    source: "mock",
  },
  action: {
    replySubject: "Thanks for your interest, James",
    replyBody:
      "Hi James,\n\nAppreciate you contacting us from MidMarket Solutions. We help revenue teams automate inbound routing with Attio as the source of truth.\n\nI'll share a quick overview. Would a brief call next week work?\n\nBest,\nLeadLoop Agent",
    taskTitle: "[WARM] Follow up with James Okonkwo",
    taskBody: "Score 62/100. Send overview and schedule call.",
    shouldCallVoice: false,
    rationale: "Warm lead (62/100): partial ICP fit, worth nurturing.",
    source: "template",
  },
  slng: { status: "skipped" },
  attio: {
    personRecordId: "attio_person_james_okonkwo",
    companyRecordId: "attio_company_midmarket",
    noteId: "attio_note_warm_001",
    taskId: "attio_task_warm_001",
    personUrl: "https://app.attio.com/demo/person/james-okonkwo",
    companyUrl: "https://app.attio.com/demo/company/midmarket",
    skipped: false,
  },
  events: buildEvents([
    { step: "received", status: "completed", message: "Lead received", offsetMin: 8 },
    { step: "attio_upsert", status: "completed", message: "Person: attio_person_james_okonkwo", offsetMin: 7.7 },
    { step: "enriched", status: "completed", message: "fixture", offsetMin: 7.4 },
    { step: "scored", status: "completed", message: "warm (62) via mock", offsetMin: 7.1 },
    { step: "action_generated", status: "completed", message: "template", offsetMin: 6.5 },
    { step: "voice", status: "skipped", message: "Voice skipped (warm band)", offsetMin: 6.2 },
    { step: "attio_writeback", status: "completed", message: "Note attio_note_warm_001", offsetMin: 5.5 },
    { step: "completed", status: "completed", message: "Pipeline complete", offsetMin: 5 },
  ]),
  createdAt: minutesAgo(8),
  updatedAt: minutesAgo(5),
};

const COLD_RUN: LeadRun = {
  id: "demo-cold",
  status: "completed",
  currentStep: "completed",
  input: DEMO_LEADS.cold,
  enrichment: {
    domain: "localshop.com",
    description: "Local Shop Co is a small retail business with one storefront.",
    industry: "Retail",
    employee_band: "1-10 employees",
    website_url: "https://localshop.com",
    linkedin_url: null,
    news: [],
    source: "fixture",
  },
  score: {
    score: 28,
    band: "cold",
    rankReasons: ["Retail industry", "Small company size", "Low CRM automation fit"],
    source: "mock",
  },
  action: {
    replySubject: "Thanks for reaching out",
    replyBody:
      "Hi Alex,\n\nThanks for your message. LeadLoop is built for B2B teams automating inbound sales. I'll keep you on our nurture list.\n\nBest,\nLeadLoop Agent",
    shouldCallVoice: false,
    rationale: "Cold lead (28/100): low ICP fit, nurture only.",
    source: "template",
  },
  slng: { status: "skipped" },
  attio: {
    personRecordId: "attio_person_alex_rivera",
    companyRecordId: "attio_company_localshop",
    noteId: "attio_note_cold_001",
    personUrl: "https://app.attio.com/demo/person/alex-rivera",
    companyUrl: "https://app.attio.com/demo/company/local-shop",
    skipped: false,
  },
  events: buildEvents([
    { step: "received", status: "completed", message: "Lead received", offsetMin: 12 },
    { step: "attio_upsert", status: "completed", message: "Person: attio_person_alex_rivera", offsetMin: 11.7 },
    { step: "enriched", status: "completed", message: "fixture", offsetMin: 11.4 },
    { step: "scored", status: "completed", message: "cold (28) via mock", offsetMin: 11.1 },
    { step: "action_generated", status: "completed", message: "template (nurture)", offsetMin: 10.5 },
    { step: "voice", status: "skipped", message: "Voice skipped (cold band)", offsetMin: 10.2 },
    { step: "attio_writeback", status: "completed", message: "Note attio_note_cold_001", offsetMin: 9.5 },
    { step: "completed", status: "completed", message: "Pipeline complete", offsetMin: 9 },
  ]),
  createdAt: minutesAgo(12),
  updatedAt: minutesAgo(9),
};

export const WORKSPACE_FIXTURES: Record<DemoScenario, LeadRun> = {
  hot: HOT_RUN,
  warm: WARM_RUN,
  cold: COLD_RUN,
};

export const INITIAL_QUEUE: LeadRun[] = [HOT_RUN, WARM_RUN, COLD_RUN];

export function scenarioFromRun(run: LeadRun): DemoScenario | undefined {
  if (run.id === "demo-hot" || run.input.source === "demo_hot") return "hot";
  if (run.id === "demo-warm" || run.input.source === "demo_warm") return "warm";
  if (run.id === "demo-cold" || run.input.source === "demo_cold") return "cold";
  return undefined;
}

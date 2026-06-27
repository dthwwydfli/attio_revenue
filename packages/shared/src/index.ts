import { z } from "zod";

export const LeadBandSchema = z.enum(["hot", "warm", "cold", "needs_review"]);
export type LeadBand = z.infer<typeof LeadBandSchema>;

export const RoutingStatusSchema = z.enum([
  "processing",
  "routed",
  "voice_pending",
  "completed",
  "failed",
]);
export type RoutingStatus = z.infer<typeof RoutingStatusSchema>;

export const SlngStatusSchema = z.enum([
  "skipped",
  "web_session_started",
  "call_completed",
  "failed",
]);
export type SlngStatus = z.infer<typeof SlngStatusSchema>;

export const PipelineStepSchema = z.enum([
  "received",
  "attio_upsert",
  "enriched",
  "scored",
  "action_generated",
  "voice",
  "attio_writeback",
  "completed",
  "failed",
]);
export type PipelineStep = z.infer<typeof PipelineStepSchema>;

export const LeadInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
  role: z.string().optional(),
  message: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().default("demo_form"),
  domain: z.string().optional(),
});
export type LeadInput = z.infer<typeof LeadInputSchema>;

export const EnrichmentSourceSchema = z.enum([
  "tavily",
  "fixture",
  "placeholder",
]);
export type EnrichmentSource = z.infer<typeof EnrichmentSourceSchema>;

export const EnrichmentResultSchema = z.object({
  domain: z.string().nullable(),
  description: z.string().nullable(),
  industry: z.string().nullable(),
  employee_band: z.string().nullable(),
  website_url: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  news: z.array(z.string()),
  source: EnrichmentSourceSchema,
});
export type EnrichmentResult = z.infer<typeof EnrichmentResultSchema>;

export const ScoreResultSchema = z.object({
  score: z.number().min(0).max(100),
  band: LeadBandSchema,
  rankReasons: z.array(z.string()),
  source: z.enum(["superlinked", "mock"]),
});
export type ScoreResult = z.infer<typeof ScoreResultSchema>;

export const GeneratedActionSchema = z.object({
  replySubject: z.string(),
  replyBody: z.string(),
  taskTitle: z.string().optional(),
  taskBody: z.string().optional(),
  shouldCallVoice: z.boolean(),
  rationale: z.string(),
  source: z.enum(["openai", "groq", "template", "sie", "anthropic", "gemini", "fallback"]),
});
export type GeneratedAction = z.infer<typeof GeneratedActionSchema>;

export const SlngResultSchema = z.object({
  status: SlngStatusSchema,
  callId: z.string().optional(),
  /** @deprecated Use livekitUrl — kept for backwards compatibility */
  roomUrl: z.string().optional(),
  livekitUrl: z.string().optional(),
  livekitToken: z.string().optional(),
  transcriptSnippet: z.string().optional(),
});
export type SlngResult = z.infer<typeof SlngResultSchema>;

export const AttioWritebackSchema = z.object({
  personRecordId: z.string().optional(),
  companyRecordId: z.string().optional(),
  noteId: z.string().optional(),
  taskId: z.string().optional(),
  personUrl: z.string().optional(),
  companyUrl: z.string().optional(),
  skipped: z.boolean().default(false),
  reason: z.string().optional(),
});
export type AttioWriteback = z.infer<typeof AttioWritebackSchema>;

export const AuditEventSchema = z.object({
  step: PipelineStepSchema,
  status: z.enum(["started", "completed", "failed", "skipped"]),
  durationMs: z.number().optional(),
  message: z.string().optional(),
  timestamp: z.string(),
});
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const LeadRunSchema = z.object({
  id: z.string(),
  status: RoutingStatusSchema,
  currentStep: PipelineStepSchema,
  input: LeadInputSchema,
  enrichment: EnrichmentResultSchema.optional(),
  score: ScoreResultSchema.optional(),
  action: GeneratedActionSchema.optional(),
  slng: SlngResultSchema.optional(),
  attio: AttioWritebackSchema.optional(),
  events: z.array(AuditEventSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  error: z.string().optional(),
  humanApproved: z.boolean().optional(),
  approvedAt: z.string().optional(),
});
export type LeadRun = z.infer<typeof LeadRunSchema>;

export const LeadStatusResponseSchema = z.object({
  id: z.string(),
  status: RoutingStatusSchema,
  currentStep: PipelineStepSchema,
  events: z.array(AuditEventSchema),
  score: ScoreResultSchema.optional(),
  slng: SlngResultSchema.optional(),
  attio: AttioWritebackSchema.optional(),
  error: z.string().optional(),
  humanApproved: z.boolean().optional(),
  approvedAt: z.string().optional(),
});
export type LeadStatusResponse = z.infer<typeof LeadStatusResponseSchema>;

export const ApproveLeadResponseSchema = z.object({
  ok: z.literal(true),
  humanApproved: z.literal(true),
  mailtoUrl: z.string().optional(),
  approvedAt: z.string(),
});
export type ApproveLeadResponse = z.infer<typeof ApproveLeadResponseSchema>;

export const ProcessLeadResponseSchema = z.object({
  leadRunId: z.string(),
  status: RoutingStatusSchema,
  band: LeadBandSchema.optional(),
  attioPersonUrl: z.string().optional(),
});
export type ProcessLeadResponse = z.infer<typeof ProcessLeadResponseSchema>;

export const ProcessLeadByPersonSchema = z.object({
  personId: z.string().min(1),
});
export type ProcessLeadByPersonInput = z.infer<typeof ProcessLeadByPersonSchema>;

export const PipelineScoringResultSchema = z.object({
  score: z.number(),
  band: z.enum(["hot", "warm", "cold"]),
  explanation: z.string(),
  sieScore: z.number().nullable(),
  source: z.enum(["superlinked", "heuristic"]),
});
export type PipelineScoringResult = z.infer<typeof PipelineScoringResultSchema>;

export const PipelineAttioResultSchema = z.object({
  noteId: z.string().nullable(),
  taskId: z.string().nullable(),
});
export type PipelineAttioResult = z.infer<typeof PipelineAttioResultSchema>;

export const PipelineSuccessResultSchema = z.object({
  ok: z.literal(true),
  lead: LeadInputSchema,
  enrichment: EnrichmentResultSchema,
  scoring: PipelineScoringResultSchema,
  action: GeneratedActionSchema,
  attio: PipelineAttioResultSchema,
  n8nTriggered: z.boolean(),
});
export type PipelineSuccessResult = z.infer<typeof PipelineSuccessResultSchema>;

export const PipelineErrorResultSchema = z.object({
  ok: z.literal(false),
  reason: z.enum(["lead_not_found", "pipeline_error"]),
  error: z.string().optional(),
});
export type PipelineErrorResult = z.infer<typeof PipelineErrorResultSchema>;

export const PipelineResultSchema = z.union([
  PipelineSuccessResultSchema,
  PipelineErrorResultSchema,
]);
export type PipelineResult = z.infer<typeof PipelineResultSchema>;

export const DemoScenarioSchema = z.enum(["hot", "warm", "cold"]);
export type DemoScenario = z.infer<typeof DemoScenarioSchema>;

export const DEMO_LEADS: Record<DemoScenario, LeadInput> = {
  hot: {
    name: "Sarah Chen",
    email: "sarah.chen@acmecorp.io",
    company: "Acme Corp",
    role: "VP Revenue Operations",
    message:
      "We're evaluating agentic CRM tools for our 200-person SaaS team. Need autonomous lead routing and Attio integration. Budget approved for Q3.",
    phone: "+14155550100",
    source: "demo_hot",
    domain: "acmecorp.io",
  },
  warm: {
    name: "James Okonkwo",
    email: "james@midmarket.io",
    company: "MidMarket Solutions",
    role: "Head of Sales",
    message:
      "Interested in improving our inbound lead response time. Currently using a basic CRM.",
    source: "demo_warm",
    domain: "midmarket.io",
  },
  cold: {
    name: "Alex Rivera",
    email: "alex@localshop.com",
    company: "Local Shop Co",
    role: "Owner",
    message: "Looking for a simple contact form. Small retail business.",
    source: "demo_cold",
    domain: "localshop.com",
  },
};


export function scoreToBand(normalizedScore: number): LeadBand {
  if (normalizedScore >= 0.75) return "hot";
  if (normalizedScore >= 0.5) return "warm";
  if (normalizedScore >= 0.3) return "cold";
  return "needs_review";
}

export function inferDomain(email: string, company: string, domain?: string): string {
  if (domain) return domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const emailDomain = email.split("@")[1];
  if (emailDomain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].includes(emailDomain)) {
    return emailDomain;
  }
  return `${company.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
}

export function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

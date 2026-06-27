import type { LucideIcon } from "lucide-react";
import {
  Database,
  Globe,
  MessageSquare,
  Sparkles,
  Target,
  Webhook,
  Workflow,
  Zap,
} from "lucide-react";

export const HERO_COPY = {
  eyebrow: "Attio Agentic CRM Hackathon",
  productName: "LeadLoop",
  headline: "Your CRM should act, not wait.",
  subhead:
    "LeadLoop turns inbound leads into autonomous CRM actions: enriched, ranked against your ICP, responded to, and written back to Attio. Orchestrated by n8n. Reviewed by you only when it matters.",
  primaryCta: "Run demo lead",
  secondaryCta: "See workflow",
} as const;

export const HERO_PREVIEW = {
  name: "Sarah Chen",
  role: "VP Revenue Operations",
  company: "Acme Corp",
  email: "sarah.chen@acmecorp.io",
  scoreBand: "hot" as const,
  score: 87,
  pipelineSteps: ["Received", "Enriched", "Scored", "Action", "Attio"],
  activeStep: 3,
  enrichment:
    "B2B SaaS · 120-250 employees · Recent Series B · Evaluating RevOps tooling",
  reply:
    "Hi Sarah, saw Acme is scaling RevOps post-Series B. Happy to walk through how agentic routing keeps hot leads from stalling in queue.",
} as const;

export type FeatureAccent = "mint" | "lavender" | "peach" | "teal";

export interface FeatureItem {
  step: string;
  title: string;
  description: string;
  accent: FeatureAccent;
  icon: LucideIcon;
}

export const FEATURES: FeatureItem[] = [
  {
    step: "01",
    title: "Enrich",
    description:
      "Pull firmographics, domain signals, and recent context from public web data before anyone opens the record.",
    accent: "mint",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Rank",
    description:
      "Score every lead against your ICP with Superlinked. Hot leads get priority routing and voice.",
    accent: "lavender",
    icon: Target,
  },
  {
    step: "03",
    title: "Respond",
    description:
      "Generate a personalised reply and pick the right channel (email, task, or SLNG voice) for the band.",
    accent: "peach",
    icon: MessageSquare,
  },
  {
    step: "04",
    title: "Write back",
    description:
      "Upsert the person and company in Attio with score, enrichment, reply draft, and activity log.",
    accent: "teal",
    icon: Database,
  },
];

export interface WorkflowNode {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  active?: boolean;
}

export const WORKFLOW_NODES: WorkflowNode[] = [
  { id: "webhook", label: "Webhook", sublabel: "Inbound", icon: Webhook },
  { id: "n8n", label: "n8n", sublabel: "Orchestrate", icon: Workflow, active: true },
  { id: "enrich", label: "Enrichment", sublabel: "LeadLoop API", icon: Globe },
  { id: "superlinked", label: "Superlinked", sublabel: "ICP Score", icon: Target },
  { id: "slng", label: "SLNG", sublabel: "Voice", icon: Zap },
  { id: "attio", label: "Attio", sublabel: "Writeback", icon: Database },
];

export const WORKFLOW_CAPTION = "One webhook in. A fully actioned CRM record out.";

export const FINAL_CTA = {
  headline: "Send one lead. Watch the loop run.",
  subhead:
    "Run a demo lead through enrichment, scoring, response generation, and Attio writeback, live.",
  primaryCta: "Run demo lead",
  secondaryCta: "Live pipeline",
} as const;

export const ACCENT_STYLES: Record<
  FeatureAccent,
  { border: string; glow: string; icon: string; gradient: string }
> = {
  mint: {
    border: "border-accent-mint/20",
    glow: "hover:shadow-[0_0_40px_-8px_rgba(164,212,197,0.3)]",
    icon: "text-accent-mint bg-accent-mint/10",
    gradient: "from-accent-mint/10 to-transparent",
  },
  lavender: {
    border: "border-accent-lavender/20",
    glow: "hover:shadow-[0_0_40px_-8px_rgba(184,164,237,0.3)]",
    icon: "text-accent-lavender bg-accent-lavender/10",
    gradient: "from-accent-lavender/10 to-transparent",
  },
  peach: {
    border: "border-accent-peach/20",
    glow: "hover:shadow-[0_0_40px_-8px_rgba(255,176,132,0.3)]",
    icon: "text-accent-peach bg-accent-peach/10",
    gradient: "from-accent-peach/10 to-transparent",
  },
  teal: {
    border: "border-accent-teal/30",
    glow: "hover:shadow-[0_0_40px_-8px_rgba(34,197,94,0.25)]",
    icon: "text-accent bg-accent/10",
    gradient: "from-accent/10 to-transparent",
  },
};

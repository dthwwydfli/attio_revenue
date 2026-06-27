import type { LeadRun } from "@leadloop/shared";
import { ArrowRight, Mail, Phone, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { isProcessing } from "@/lib/workspace-utils";

interface ActionCardProps {
  run: LeadRun;
}

const BAND_CONFIG = {
  hot: {
    title: "Priority outreach ready",
    description: "Email draft prepared and SLNG voice call queued for immediate follow-up.",
    primary: "Approve & send outreach",
    icon: Phone,
    accent: "border-accent/20 bg-accent/5",
  },
  warm: {
    title: "Standard follow-up ready",
    description: "Personalized email draft and Attio task are ready for your review.",
    primary: "Send email & create task",
    icon: Mail,
    accent: "border-accent-ochre/20 bg-accent-ochre/5",
  },
  cold: {
    title: "Queued for nurture",
    description: "Lead flagged for manual review — no autonomous outreach will be sent.",
    primary: "Move to nurture queue",
    icon: UserCheck,
    accent: "border-blue-400/20 bg-blue-400/5",
  },
} as const;

export function ActionCard({ run }: ActionCardProps) {
  const processing = isProcessing(run);
  const band = run.score?.band;
  const config =
    band && band in BAND_CONFIG
      ? BAND_CONFIG[band as keyof typeof BAND_CONFIG]
      : BAND_CONFIG.warm;
  const Icon = config.icon;
  const showVoiceLink = run.slng && run.slng.status !== "skipped" && run.slng.roomUrl;

  return (
    <div className={cn("glass-panel rounded-xl border p-6 md:p-8", config.accent)}>
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-accent" aria-hidden />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
              Next action
            </h2>
          </div>
          <p className="font-display text-xl font-medium tracking-tight md:text-2xl">
            {config.title}
          </p>
          <p className="text-sm leading-relaxed text-muted">{config.description}</p>
        </div>

        <Button
          disabled={processing || !run.action}
          className="w-full gap-2"
          aria-label={config.primary}
        >
          {processing ? "Processing…" : config.primary}
          {!processing && <ArrowRight className="h-4 w-4" aria-hidden />}
        </Button>

        {(run.attio?.personUrl || showVoiceLink) && (
          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
            {run.attio?.personUrl && (
              <Button
                variant="secondary"
                href={run.attio.personUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Attio
              </Button>
            )}
            {showVoiceLink && (
              <Button
                variant="secondary"
                href={run.slng!.roomUrl!}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open voice session
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

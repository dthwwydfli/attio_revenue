"use client";

import type { LeadRun } from "@leadloop/shared";
import { CheckCircle2, Loader2, Mail, Phone, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { cn } from "@/lib/utils";
import { isFailed, isProcessing } from "@/lib/workspace-utils";

interface ActionCardProps {
  run: LeadRun;
  isApproving?: boolean;
  approveError?: string | null;
  onApprove?: () => void;
}

const BAND_CONFIG = {
  hot: {
    title: "Priority outreach ready",
    description:
      "Pipeline completed autonomously. Approve to open the draft in your email client and confirm outreach.",
    primary: "Approve & send outreach",
    approved: "Outreach approved",
    icon: Phone,
    accent: "border-accent/20 bg-accent/5",
  },
  warm: {
    title: "Standard follow-up ready",
    description:
      "Pipeline completed autonomously. Approve to open the email draft and confirm the Attio task.",
    primary: "Send email & create task",
    approved: "Follow-up approved",
    icon: Mail,
    accent: "border-accent-ochre/20 bg-accent-ochre/5",
  },
  cold: {
    title: "Queued for nurture",
    description:
      "Lead flagged for manual review. Confirm to move to the nurture queue. No autonomous outreach.",
    primary: "Move to nurture queue",
    approved: "Added to nurture queue",
    icon: UserCheck,
    accent: "border-blue-400/20 bg-blue-400/5",
  },
} as const;

export function ActionCard({ run, isApproving, approveError, onApprove }: ActionCardProps) {
  const processing = isProcessing(run);
  const failed = isFailed(run);
  const approved = Boolean(run.humanApproved);
  const band = run.score?.band;
  const config =
    band && band in BAND_CONFIG
      ? BAND_CONFIG[band as keyof typeof BAND_CONFIG]
      : BAND_CONFIG.warm;
  const Icon = config.icon;
  const showVoiceLink =
    run.slng && run.slng.status !== "skipped" && band === "hot";
  const voiceHref = `/voice/${run.id}`;

  const buttonLabel = approved
    ? config.approved
    : isApproving
      ? "Approving…"
      : processing
        ? "Processing…"
        : config.primary;

  return (
    <div
      className={cn(
        "glass-panel rounded-xl border p-6 md:p-8",
        failed ? "border-red-500/20 bg-red-500/5" : config.accent,
      )}
    >
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
          disabled={processing || failed || approved || isApproving || !run.action || !onApprove}
          onClick={onApprove}
          aria-busy={isApproving}
          aria-label={buttonLabel}
          className="min-h-[44px] w-full gap-2"
        >
          {isApproving ? (
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden />
          ) : approved ? (
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          ) : !processing ? (
            <ArrowIcon className="h-4 w-4" />
          ) : null}
          {buttonLabel}
        </Button>

        {approveError && (
          <StatusBanner variant="error" live="assertive">
            {approveError}
          </StatusBanner>
        )}

        {approved && !approveError && (
          <StatusBanner variant="success">
            {band === "cold"
              ? "Nurture queue confirmed and logged in Attio."
              : "Approved. Check your email client for the draft."}
          </StatusBanner>
        )}

        {(run.attio?.personUrl || showVoiceLink) && (
          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
            {run.attio?.personUrl && (
              <Button
                variant="secondary"
                href={run.attio.personUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px]"
              >
                Open in Attio
              </Button>
            )}
            {showVoiceLink && (
              <Button variant="secondary" href={voiceHref} className="min-h-[44px]">
                Open voice session
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

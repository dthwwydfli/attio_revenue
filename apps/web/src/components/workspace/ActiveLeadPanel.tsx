import type { LeadRun } from "@leadloop/shared";
import { ScoreBadge } from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";
import { CompactSyncStatus } from "./CompactSyncStatus";
import {
  isFailed,
  isProcessing,
  latestEventMessage,
  routingLabel,
} from "@/lib/workspace-utils";

interface ActiveLeadPanelProps {
  run: LeadRun;
}

export function ActiveLeadPanel({ run }: ActiveLeadPanelProps) {
  const processing = isProcessing(run);
  const failed = isFailed(run);
  const summary =
    (failed && run.error ? run.error : latestEventMessage(run.events)) ?? routingLabel(run);

  return (
    <header className="space-y-4 border-b border-white/5 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">
            {run.input.name}
          </h1>
          <p className="text-sm text-muted">
            {run.input.role ?? "Contact"} · {run.input.company}
          </p>
        </div>
        <ScoreBadge band={run.score?.band} score={run.score?.score} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p
          className={cn(
            "text-xs font-medium",
            processing ? "text-accent" : failed ? "text-red-400" : "text-foreground",
          )}
        >
          {processing ? "Processing" : failed ? "Failed" : "Complete"}
        </p>
        <span className="hidden text-muted/40 sm:inline" aria-hidden>
          ·
        </span>
        <p className={failed ? "text-sm text-red-300" : "text-sm text-muted"}>{summary}</p>
      </div>

      <CompactSyncStatus attio={run.attio} slng={run.slng} />
    </header>
  );
}

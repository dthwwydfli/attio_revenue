import type { LeadRun } from "@leadloop/shared";
import { ScoreBadge } from "@/components/ScoreBadge";
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
        <div className="flex items-center gap-2 text-xs text-muted">
          {processing ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="font-medium text-accent">Processing</span>
            </>
          ) : failed ? (
            <>
              <span className="inline-flex h-2 w-2 rounded-full bg-red-400" aria-hidden />
              <span className="font-medium text-red-400">Failed</span>
            </>
          ) : (
            <>
              <span className="inline-flex h-2 w-2 rounded-full bg-accent" aria-hidden />
              <span className="font-medium text-foreground">Complete</span>
            </>
          )}
        </div>
        <span className="hidden text-muted/40 sm:inline" aria-hidden>
          ·
        </span>
        <p className={failed ? "text-sm text-red-300" : "text-sm text-muted"}>{summary}</p>
      </div>

      <CompactSyncStatus attio={run.attio} slng={run.slng} />
    </header>
  );
}

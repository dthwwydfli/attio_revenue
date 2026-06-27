"use client";

import type { LeadRun } from "@leadloop/shared";
import { cn, bandColor } from "@/lib/utils";
import { formatRelativeTime, isProcessing } from "@/lib/workspace-utils";

interface LeadQueueItemProps {
  run: LeadRun;
  selected: boolean;
  onSelect: () => void;
}

export function LeadQueueItem({ run, selected, onSelect }: LeadQueueItemProps) {
  const band = run.score?.band;
  const processing = isProcessing(run);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "w-full cursor-pointer rounded-lg border px-3 py-2.5 text-left transition-all duration-200",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "min-h-[64px]",
        selected
          ? "border-accent/30 bg-accent/5"
          : "border-transparent bg-transparent hover:bg-white/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{run.input.name}</p>
          <p className="truncate text-xs text-muted">{run.input.company}</p>
        </div>
        {band && (
          <span
            className={cn(
              "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize",
              bandColor(band),
            )}
          >
            {band}
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted tabular-nums">
          {formatRelativeTime(run.updatedAt)}
        </span>
        {processing && (
          <span className="flex items-center gap-1 text-[10px] text-accent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
            </span>
            Running
          </span>
        )}
      </div>
    </button>
  );
}

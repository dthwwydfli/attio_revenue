"use client";

import type { LeadBand, LeadRun } from "@leadloop/shared";
import { cn } from "@/lib/utils";
import { LeadQueueItem } from "./LeadQueueItem";
import { QueueItemSkeleton } from "./LoadingSkeleton";

type BandFilter = LeadBand | "all";

const FILTERS: { value: BandFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

interface LeadQueueListProps {
  queue: LeadRun[];
  selectedId: string;
  bandFilter: BandFilter;
  isReplaying: boolean;
  onSelect: (id: string) => void;
  onFilterChange: (filter: BandFilter) => void;
}

export function LeadQueueList({
  queue,
  selectedId,
  bandFilter,
  isReplaying,
  onSelect,
  onFilterChange,
}: LeadQueueListProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
          Queue
        </p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by band">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => onFilterChange(value)}
              aria-pressed={bandFilter === value}
              className={cn(
                "min-h-[32px] cursor-pointer rounded-lg px-2.5 py-1 text-xs capitalize transition-colors duration-200",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                bandFilter === value
                  ? "bg-accent/15 text-accent"
                  : "bg-white/5 text-muted hover:bg-white/10 hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {isReplaying && queue.length === 0 && <QueueItemSkeleton />}
        {queue.length === 0 && !isReplaying && (
          <p className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-xs text-muted">
            No leads match this filter.
          </p>
        )}
        {queue.map((run) => (
          <LeadQueueItem
            key={run.id}
            run={run}
            selected={run.id === selectedId}
            onSelect={() => onSelect(run.id)}
          />
        ))}
      </div>
    </div>
  );
}

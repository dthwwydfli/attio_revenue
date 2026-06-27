"use client";

import { cn } from "@/lib/utils";

export type WorkspaceTab = "overview" | "details" | "activity" | "security";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "details", label: "Details" },
  { id: "activity", label: "Activity" },
  { id: "security", label: "Security" },
];

interface WorkspaceTabsProps {
  active: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  activityCount?: number;
}

export function WorkspaceTabs({ active, onChange, activityCount }: WorkspaceTabsProps) {
  return (
    <div className="overflow-x-auto">
      <div
        role="tablist"
        aria-label="Lead detail sections"
        className="inline-flex min-w-0 gap-1 whitespace-nowrap rounded-xl border border-white/5 bg-background/40 p-1"
      >
        {TABS.map(({ id, label }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={selected}
              aria-controls={`panel-${id}`}
              onClick={() => onChange(id)}
              className={cn(
                "relative min-h-[40px] shrink-0 cursor-pointer rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-200",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                selected
                  ? "bg-white/10 text-foreground shadow-sm"
                  : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              {label}
              {id === "activity" && activityCount !== undefined && activityCount > 0 && (
                <span className="ml-1.5 text-xs tabular-nums text-muted">({activityCount})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

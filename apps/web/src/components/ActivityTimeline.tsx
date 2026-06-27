import type { AuditEvent } from "@leadloop/shared";
import { cn } from "@/lib/utils";

interface ActivityTimelineProps {
  events: AuditEvent[];
  compact?: boolean;
}

export function ActivityTimeline({ events, compact = false }: ActivityTimelineProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-background/50",
        compact ? "p-4" : "glass-panel p-6 md:p-8",
      )}
    >
      <h2 className={cn("font-semibold", compact ? "mb-3 text-sm" : "mb-6 text-base")}>
        Activity
      </h2>
      <ul
        className={cn(
          "space-y-3",
          compact ? "max-h-48 overflow-y-auto pr-1 text-xs" : "text-sm",
        )}
        aria-label="Pipeline activity log"
      >
        {events.length === 0 && (
          <li className="text-muted">Waiting for pipeline events…</li>
        )}
        {events.map((e, i) => (
          <li
            key={`${e.step}-${e.timestamp}-${i}`}
            className="flex gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0 text-muted"
          >
            <time className="shrink-0 font-mono text-xs tabular-nums">
              {new Date(e.timestamp).toLocaleTimeString()}
            </time>
            <span className="leading-relaxed">
              <span className="font-medium text-foreground capitalize">
                {e.step.replace(/_/g, " ")}
              </span>
              {" · "}
              {e.status}
              {e.message ? `: ${e.message}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

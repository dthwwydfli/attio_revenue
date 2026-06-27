import type { AuditEvent } from "@leadloop/shared";

export function ActivityTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold mb-3">Activity</h3>
      <ul className="space-y-2 text-sm">
        {events.map((e, i) => (
          <li key={i} className="flex gap-2 text-muted">
            <time className="shrink-0 font-mono text-xs">
              {new Date(e.timestamp).toLocaleTimeString()}
            </time>
            <span>
              <span className="text-foreground capitalize">{e.step.replace(/_/g, " ")}</span>
              {" — "}
              {e.status}
              {e.message ? `: ${e.message}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

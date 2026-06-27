import type { LeadRun } from "@leadloop/shared";
import { Route, Mail, Phone, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { isProcessing, routingLabel } from "@/lib/workspace-utils";

interface MainStatusCardProps {
  run: LeadRun;
}

export function MainStatusCard({ run }: MainStatusCardProps) {
  const processing = isProcessing(run);
  const band = run.score?.band;
  const action = run.action;

  const channels: { icon: typeof Mail; label: string; active: boolean }[] = [
    { icon: Mail, label: "Email", active: Boolean(action?.replyBody) },
    {
      icon: Phone,
      label: "Voice",
      active: run.slng?.status !== undefined && run.slng.status !== "skipped",
    },
    {
      icon: ClipboardList,
      label: "Attio task",
      active: Boolean(action?.taskTitle),
    },
  ];

  return (
    <div className="glass-panel rounded-xl p-5 md:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Route className="h-4 w-4 text-accent" aria-hidden />
        <h2 className="text-sm font-semibold">Routing decision</h2>
        {processing && (
          <span className="ml-auto text-xs text-accent motion-safe:animate-pulse">
            Updating…
          </span>
        )}
      </div>

      <p className="font-display text-xl font-medium leading-snug">
        {routingLabel(run)}
      </p>

      {action?.rationale && (
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          {action.rationale}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {channels.map(({ icon: Icon, label, active }) => (
          <span
            key={label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs",
              active
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-white/5 bg-white/5 text-muted/60",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </span>
        ))}
      </div>

      {band === "cold" && (
        <p className="mt-5 rounded-lg border border-blue-400/20 bg-blue-400/5 px-4 py-3 text-xs leading-relaxed text-blue-300">
          Flagged for nurture — no autonomous outreach.
        </p>
      )}
    </div>
  );
}

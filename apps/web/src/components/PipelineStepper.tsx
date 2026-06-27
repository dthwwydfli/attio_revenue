const STEPS = [
  { key: "received", label: "Received" },
  { key: "attio_upsert", label: "Attio Upsert" },
  { key: "enriched", label: "Enriched" },
  { key: "scored", label: "Scored" },
  { key: "action_generated", label: "Action" },
  { key: "voice", label: "Voice" },
  { key: "attio_writeback", label: "Attio Writeback" },
  { key: "completed", label: "Complete" },
] as const;

interface PipelineStepperProps {
  currentStep: string;
  events: Array<{ step: string; status: string; durationMs?: number }>;
}

function stepIndex(step: string): number {
  const idx = STEPS.findIndex((s) => s.key === step);
  return idx >= 0 ? idx : 0;
}

export function PipelineStepper({ currentStep, events }: PipelineStepperProps) {
  const currentIdx = stepIndex(currentStep);
  const completedSteps = new Set(
    events.filter((e) => e.status === "completed").map((e) => e.step),
  );

  return (
    <ol className="space-y-3">
      {STEPS.map((step, idx) => {
        const isDone = completedSteps.has(step.key) || idx < currentIdx;
        const isCurrent = step.key === currentStep;
        const event = events.find((e) => e.step === step.key && e.status === "completed");

        return (
          <li
            key={step.key}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
              isCurrent
                ? "border-accent/50 bg-accent/5"
                : isDone
                  ? "border-border bg-card"
                  : "border-border/50 bg-card/30 opacity-50"
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDone ? "bg-accent text-black" : isCurrent ? "bg-accent/20 text-accent" : "bg-border text-muted"
              }`}
            >
              {isDone ? "✓" : idx + 1}
            </span>
            <div className="flex-1">
              <p className="font-medium">{step.label}</p>
              {event?.durationMs !== undefined && (
                <p className="text-xs text-muted">{event.durationMs}ms</p>
              )}
            </div>
            {isCurrent && !isDone && (
              <span className="text-xs text-accent animate-pulse">Running…</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

import type { AuditEvent, LeadRun, PipelineStep } from "@leadloop/shared";

/** Gemini sometimes returns literal `\n` in stored reply text. */
export function formatEmailBody(body: string): string {
  return body.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

export const WORKSPACE_STEPS = [
  { key: "received", label: "Received" },
  { key: "enriched", label: "Enriched" },
  { key: "scored", label: "Scored" },
  { key: "routed", label: "Routed" },
  { key: "attio", label: "Written to Attio" },
] as const;

export type WorkspaceStepKey = (typeof WORKSPACE_STEPS)[number]["key"];

const STEP_MAP: Record<PipelineStep, WorkspaceStepKey> = {
  received: "received",
  attio_upsert: "received",
  enriched: "enriched",
  scored: "scored",
  action_generated: "routed",
  voice: "routed",
  attio_writeback: "attio",
  completed: "attio",
  failed: "routed",
};

export function toWorkspaceStep(step: PipelineStep): WorkspaceStepKey {
  return STEP_MAP[step] ?? "received";
}

export function workspaceStepIndex(step: WorkspaceStepKey): number {
  return WORKSPACE_STEPS.findIndex((s) => s.key === step);
}

export function getWorkspaceStepState(
  run: LeadRun,
): { activeIndex: number; completedIndices: Set<number> } {
  const activeKey = toWorkspaceStep(run.currentStep);
  const activeIndex = workspaceStepIndex(activeKey);

  const completedIndices = new Set<number>();
  for (const event of run.events) {
    if (event.status === "completed") {
      const key = toWorkspaceStep(event.step);
      completedIndices.add(workspaceStepIndex(key));
    }
    if (event.step === "attio_writeback" && event.status === "skipped") {
      completedIndices.delete(workspaceStepIndex("attio"));
    }
  }

  if (run.status === "completed" && !run.attio?.skipped) {
    WORKSPACE_STEPS.forEach((_, i) => completedIndices.add(i));
  }

  return { activeIndex, completedIndices };
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins === 1) return "1 min ago";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return hrs === 1 ? "1 hr ago" : `${hrs} hr ago`;
}

export function routingLabel(run: LeadRun): string {
  const band = run.score?.band;
  if (band === "hot") return "Priority route — email + voice";
  if (band === "warm") return "Standard route — email + task";
  if (band === "cold") return "Nurture queue — manual review";
  return "Pending routing decision";
}

export function isProcessing(run: LeadRun): boolean {
  return run.status === "processing" || run.status === "voice_pending" || run.status === "routed";
}

export function isFailed(run: LeadRun): boolean {
  return run.status === "failed";
}

export function isInFlight(run: LeadRun): boolean {
  return isProcessing(run);
}

export function latestEventMessage(events: AuditEvent[]): string | undefined {
  const last = events[events.length - 1];
  return last?.message;
}

import type { AuditEvent, LeadRun } from "@leadloop/shared";

const MAX_RUNS = 50;
const runs = new Map<string, LeadRun>();

export function saveRun(run: LeadRun): void {
  runs.set(run.id, run);
  if (runs.size > MAX_RUNS) {
    const oldest = [...runs.entries()].sort(
      (a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime(),
    )[0]?.[0];
    if (oldest) runs.delete(oldest);
  }
}

export function getRun(id: string): LeadRun | undefined {
  return runs.get(id);
}

export function updateRun(id: string, patch: Partial<LeadRun>): LeadRun | undefined {
  const existing = runs.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  runs.set(id, updated);
  return updated;
}

export function appendEvent(id: string, event: AuditEvent): LeadRun | undefined {
  const existing = runs.get(id);
  if (!existing) return undefined;
  const updated = {
    ...existing,
    events: [...existing.events, event],
    updatedAt: new Date().toISOString(),
  };
  runs.set(id, updated);
  return updated;
}

export function listRuns(): LeadRun[] {
  return [...runs.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

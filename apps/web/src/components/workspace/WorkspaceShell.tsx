"use client";

import { CenterPanel } from "./CenterPanel";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { useWorkspaceLeads } from "./useWorkspaceLeads";
import type { DemoScenario } from "@leadloop/shared";

interface WorkspaceShellProps {
  initialLeadId?: string | null;
}

export function WorkspaceShell({ initialLeadId }: WorkspaceShellProps) {
  const {
    queue,
    selected,
    selectedId,
    bandFilter,
    isLoading,
    isReplaying,
    replayError,
    setBandFilter,
    selectLead,
    replayScenario,
  } = useWorkspaceLeads(initialLeadId);

  const run = selected?.run;

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <WorkspaceSidebar
        queue={queue.map((q) => q.run)}
        selectedId={selectedId}
        bandFilter={bandFilter}
        isReplaying={isReplaying}
        replayError={replayError}
        onSelect={selectLead}
        onFilterChange={setBandFilter}
        onReplay={(s: DemoScenario) => void replayScenario(s)}
      />

      <main
        id="main-content"
        className="min-h-0 flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10 lg:px-12"
        aria-label="Active lead workflow"
      >
        {run ? (
          <CenterPanel run={run} isLoading={isLoading} />
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-24 text-center">
            <p className="font-display text-lg font-medium text-foreground">
              Select a lead
            </p>
            <p className="mt-2 text-sm text-muted">
              Hover the sidebar to expand the queue, then choose a lead to review.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
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
        className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12"
        aria-label="Active lead workflow"
      >
        <AnimatePresence mode="wait">
          {run ? (
            <motion.div
              key={run.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <CenterPanel run={run} isLoading={isLoading} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mx-auto flex max-w-lg flex-col items-center justify-center py-32 text-center"
            >
              <p className="font-display text-lg font-medium text-foreground">
                Select a lead
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Choose a lead from the queue to review routing, enrichment, and outreach drafts.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

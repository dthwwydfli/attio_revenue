"use client";

import { AnimatePresence, motion } from "motion/react";
import { CenterPanel } from "./CenterPanel";
import { useWorkspace } from "./WorkspaceContext";
import { StatusBanner } from "@/components/ui/StatusBanner";

export function WorkspaceShell() {
  const {
    selected,
    isLoading,
    isApproving,
    approveError,
    pollError,
    apiOnline,
    approveLead,
  } = useWorkspace();

  const run = selected?.run;

  return (
    <div
      id="main-content"
      className="min-h-full px-4 py-6 sm:px-6 md:px-8 md:py-8"
      aria-label="Active lead workflow"
    >
      {apiOnline === false && (
        <StatusBanner variant="warning" className="mb-6">
            Demo mode: showing fixtures. Run{" "}
          <code className="rounded bg-black/20 px-1 py-0.5 text-xs">pnpm dev</code> to connect to
          the live API.
        </StatusBanner>
      )}

      {pollError && (
        <StatusBanner variant="error" className="mb-6">
          {pollError}
        </StatusBanner>
      )}

      <AnimatePresence mode="wait">
        {run ? (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <CenterPanel
              run={run}
              isLoading={isLoading}
              isApproving={isApproving}
              approveError={approveError}
              onApprove={() => void approveLead(run.id)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mx-auto flex max-w-lg flex-col items-center justify-center py-32 text-center"
          >
            <p className="font-display text-lg font-medium text-foreground">Select a lead</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Choose a lead from the queue to review routing, enrichment, and outreach drafts.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

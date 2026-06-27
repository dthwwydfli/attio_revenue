"use client";

import { Suspense } from "react";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { LeadPanelSkeleton } from "@/components/workspace/LoadingSkeleton";

export default function ConsolePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 px-6 py-10 md:px-12">
          <LeadPanelSkeleton />
        </div>
      }
    >
      <WorkspaceShell />
    </Suspense>
  );
}

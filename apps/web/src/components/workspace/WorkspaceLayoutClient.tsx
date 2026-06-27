"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WorkspaceSidebar } from "./WorkspaceSidebar";
import { WorkspaceProvider } from "./WorkspaceContext";
import { useWorkspaceLeads } from "./useWorkspaceLeads";

function WorkspaceLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const leadId = pathname === "/console" ? searchParams.get("leadId") : null;

  const workspace = useWorkspaceLeads(leadId);

  return (
    <WorkspaceProvider value={workspace}>
      <div className="flex h-full min-h-0 flex-col md:flex-row">
        <WorkspaceSidebar
          queue={workspace.queue.map((q) => q.run)}
          selectedId={workspace.selectedId}
          bandFilter={workspace.bandFilter}
          isReplaying={workspace.isReplaying}
          onSelect={workspace.selectLead}
          onFilterChange={workspace.setBandFilter}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </WorkspaceProvider>
  );
}

export function WorkspaceLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-muted">
          Loading workspace…
        </div>
      }
    >
      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
    </Suspense>
  );
}

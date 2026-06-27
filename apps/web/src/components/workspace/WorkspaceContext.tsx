"use client";

import { createContext, useContext } from "react";
import type { useWorkspaceLeads } from "./useWorkspaceLeads";

export type WorkspaceContextValue = ReturnType<typeof useWorkspaceLeads>;

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  value,
  children,
}: {
  value: WorkspaceContextValue;
  children: React.ReactNode;
}) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceLayoutClient");
  }
  return ctx;
}

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

function ConsoleContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");

  return <WorkspaceShell initialLeadId={leadId} />;
}

export default function ConsolePage() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Loading console…</p>}>
      <ConsoleContent />
    </Suspense>
  );
}

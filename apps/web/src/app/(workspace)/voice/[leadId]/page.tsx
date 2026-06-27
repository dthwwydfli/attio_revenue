"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { LeadRun } from "@leadloop/shared";
import { apiFetch } from "@/lib/api-client";
import { WorkspacePageContent } from "@/components/workspace/WorkspacePageContent";
import { VoiceSessionClient } from "@/components/workspace/VoiceSessionClient";

export default function VoiceSessionPage() {
  const params = useParams<{ leadId: string }>();
  const leadId = params.leadId;
  const [run, setRun] = useState<LeadRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;
    let active = true;

    apiFetch<LeadRun>(`/leads/${leadId}`)
      .then((data) => {
        if (active) setRun(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load lead");
      });

    return () => {
      active = false;
    };
  }, [leadId]);

  return (
    <WorkspacePageContent maxWidth="lg">
      {error && (
        <div className="glass-panel rounded-xl p-6 text-center text-sm text-red-400">{error}</div>
      )}
      {!error && !run && (
        <div className="glass-panel rounded-xl p-6 text-center text-sm text-muted">
          Loading voice session…
        </div>
      )}
      {run && <VoiceSessionClient run={run} />}
    </WorkspacePageContent>
  );
}

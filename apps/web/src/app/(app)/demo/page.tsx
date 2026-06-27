"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { LeadRun, LeadStatusResponse } from "@leadloop/shared";
import { PipelineStepper } from "@/components/PipelineStepper";
import { ScoreBadge } from "@/components/ScoreBadge";
import { EnrichmentCard } from "@/components/EnrichmentCard";
import { GeneratedReplyCard } from "@/components/GeneratedReplyCard";
import { SLNGCallStatus } from "@/components/SLNGCallStatus";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AttioRecordLink } from "@/components/AttioRecordLink";

function DemoContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("leadId");
  const [status, setStatus] = useState<LeadStatusResponse | null>(null);
  const [detail, setDetail] = useState<LeadRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!leadId) return;

    let active = true;

    const poll = async () => {
      try {
        const s = await apiFetch<LeadStatusResponse>(`/leads/${leadId}/status`);
        if (!active) return;
        setStatus(s);

        if (s.status === "completed" || s.status === "failed") {
          const d = await apiFetch<LeadRun>(`/leads/${leadId}`);
          if (active) setDetail(d);
          return false;
        }
        return true;
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Poll failed");
        return false;
      }
    };

    void poll();
    const interval = setInterval(async () => {
      const cont = await poll();
      if (!cont) clearInterval(interval);
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [leadId]);

  if (!leadId) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-muted">No lead selected.</p>
        <a href="/demo/submit" className="text-accent hover:underline">
          Submit a lead →
        </a>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400">{error}</p>;
  }

  if (!status) {
    return <p className="text-muted animate-pulse">Connecting to pipeline…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Live Pipeline</h1>
          <p className="text-sm text-muted font-mono">{leadId}</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge band={detail?.score?.band ?? status.score?.band} score={detail?.score?.score ?? status.score?.score} />
          <AttioRecordLink url={detail?.attio?.personUrl ?? status.attio?.personUrl} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineStepper currentStep={status.currentStep} events={status.events} />
        <ActivityTimeline events={status.events} />
      </div>

      {detail?.enrichment && <EnrichmentCard enrichment={detail.enrichment} />}
      {detail?.action && <GeneratedReplyCard action={detail.action} />}
      {(detail?.slng ?? status.slng) && (
        <SLNGCallStatus slng={detail?.slng ?? status.slng!} />
      )}

      {status.status === "failed" && (
        <p className="text-red-400">Pipeline failed: {status.error}</p>
      )}
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <DemoContent />
    </Suspense>
  );
}

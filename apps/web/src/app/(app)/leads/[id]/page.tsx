import { apiFetch } from "@/lib/api-client";
import { ScoreBadge } from "@/components/ScoreBadge";
import { EnrichmentCard } from "@/components/EnrichmentCard";
import { GeneratedReplyCard } from "@/components/GeneratedReplyCard";
import { SLNGCallStatus } from "@/components/SLNGCallStatus";
import { AttioRecordLink } from "@/components/AttioRecordLink";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import type { LeadRun } from "@leadloop/shared";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let run: LeadRun | null = null;
  try {
    run = await apiFetch<LeadRun>(`/leads/${id}`);
  } catch {
    run = null;
  }

  if (!run) {
    return <p className="text-muted">Lead run not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{run.input.name}</h1>
          <p className="text-muted">{run.input.company} · {run.input.email}</p>
        </div>
        <div className="flex gap-3">
          <ScoreBadge band={run.score?.band} score={run.score?.score} />
          <AttioRecordLink url={run.attio?.personUrl} />
        </div>
      </div>

      {run.enrichment && <EnrichmentCard enrichment={run.enrichment} />}
      {run.action && <GeneratedReplyCard action={run.action} />}
      {run.slng && <SLNGCallStatus slng={run.slng} leadId={run.id} />}
      <ActivityTimeline events={run.events} />
    </div>
  );
}

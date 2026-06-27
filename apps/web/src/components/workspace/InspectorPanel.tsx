import type { LeadRun } from "@leadloop/shared";
import { EnrichmentCard } from "@/components/EnrichmentCard";
import { SLNGCallStatus } from "@/components/SLNGCallStatus";
import { ScoreExplanationCard } from "./ScoreExplanationCard";
import { AttioWritebackCard } from "./AttioWritebackCard";
import { RightPanelSkeleton } from "./LoadingSkeleton";

interface InspectorPanelProps {
  run: LeadRun;
  isLoading: boolean;
}

export function InspectorPanel({ run, isLoading }: InspectorPanelProps) {
  if (isLoading && !run.enrichment && !run.score) {
    return <RightPanelSkeleton />;
  }

  return (
    <aside className="space-y-6" aria-label="Lead details">
      {run.enrichment && <EnrichmentCard enrichment={run.enrichment} variant="default" />}

      <ScoreExplanationCard score={run.score} variant="default" />

      <AttioWritebackCard attio={run.attio} variant="default" />

      {run.slng && run.slng.status !== "skipped" && (
        <SLNGCallStatus slng={run.slng} variant="default" />
      )}
    </aside>
  );
}

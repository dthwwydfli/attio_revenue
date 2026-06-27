import type { LeadRun } from "@leadloop/shared";
import { EnrichmentCard } from "@/components/EnrichmentCard";
import { ScoreExplanationCard } from "./ScoreExplanationCard";
import { AttioWritebackCard } from "./AttioWritebackCard";
import { SLNGCallStatus } from "@/components/SLNGCallStatus";

interface SupportingEvidenceProps {
  run: LeadRun;
}

export function SupportingEvidence({ run }: SupportingEvidenceProps) {
  return (
    <aside className="space-y-6" aria-label="Supporting evidence">
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">
          Evidence
        </h2>
        <div className="space-y-5">
          <ScoreExplanationCard score={run.score} />
          {run.enrichment && <EnrichmentCard enrichment={run.enrichment} />}
          <AttioWritebackCard attio={run.attio} />
          {run.slng && run.slng.status !== "skipped" && (
            <SLNGCallStatus slng={run.slng} />
          )}
        </div>
      </div>
    </aside>
  );
}

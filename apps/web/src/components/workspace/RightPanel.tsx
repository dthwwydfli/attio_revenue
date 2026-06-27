import type { LeadRun } from "@leadloop/shared";
import { SupportingEvidence } from "./SupportingEvidence";
import { RightPanelSkeleton } from "./LoadingSkeleton";

interface RightPanelProps {
  run: LeadRun;
  isLoading: boolean;
}

/** @deprecated Use SupportingEvidence inside CenterPanel instead */
export function RightPanel({ run, isLoading }: RightPanelProps) {
  if (isLoading && !run.enrichment) {
    return <RightPanelSkeleton />;
  }

  return <SupportingEvidence run={run} />;
}

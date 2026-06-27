import type { LeadRun } from "@leadloop/shared";
import { InspectorPanel } from "./InspectorPanel";

/** @deprecated Use InspectorPanel in CenterPanel instead */
export function SupportingEvidence({ run }: { run: LeadRun }) {
  return <InspectorPanel run={run} isLoading={false} />;
}

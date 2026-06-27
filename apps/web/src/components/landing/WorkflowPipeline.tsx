import Link from "next/link";
import { WORKFLOW_CAPTION, WORKFLOW_NODES } from "./landing-data";
import { OrchestrationFlow } from "./OrchestrationFlow";
import { PipelineNode } from "./PipelineNode";
import { SectionLabel } from "./SectionLabel";

export function WorkflowPipeline() {
  return (
    <section id="workflow" className="scroll-mt-24 px-4 py-24 md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <SectionLabel>Orchestration</SectionLabel>
          <h2 className="mt-3 font-display text-3xl font-medium tracking-tight md:text-4xl">
            Six systems. One loop.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted">{WORKFLOW_CAPTION}</p>
        </div>

        {/* Desktop hub-and-spoke flow */}
        <OrchestrationFlow />

        {/* Mobile / tablet vertical */}
        <div className="flex flex-col gap-0 lg:hidden">
          {WORKFLOW_NODES.map((node, idx) => (
            <PipelineNode
              key={node.id}
              node={node}
              showConnector={idx < WORKFLOW_NODES.length - 1}
              vertical
            />
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted">
          <Link
            href="/console"
            className="text-accent underline-offset-4 transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Watch a live pipeline run →
          </Link>
        </p>
      </div>
    </section>
  );
}

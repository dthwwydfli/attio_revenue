import type { LucideIcon } from "lucide-react";
import { WORKFLOW_NODES } from "./landing-data";
import { cn } from "@/lib/utils";

interface FlowNode {
  id: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  /** Anchor position as a fraction of the canvas (0–1). */
  x: number;
  y: number;
  orchestrator?: boolean;
}

const byId = (id: string) => WORKFLOW_NODES.find((n) => n.id === id)!;

// The real pipeline is sequential: a webhook hits n8n, which calls the LeadLoop
// API; the API then runs enrichment, scoring, voice, and Attio writeback in order.
const ORDER = ["webhook", "n8n", "enrich", "superlinked", "slng", "attio"] as const;

const NODES: FlowNode[] = ORDER.map((id, i) => ({
  ...byId(id),
  x: (i + 0.5) / ORDER.length,
  y: 0.5,
  orchestrator: id === "n8n",
}));

// Virtual canvas the SVG is drawn in. preserveAspectRatio="none" stretches it
// to match the container, so node percentages and beam coords stay aligned.
const VW = 1000;
const VH = 220;

const TRACK_START = NODES[0].x * VW;
const TRACK_END = NODES[NODES.length - 1].x * VW;
const TRACK_Y = NODES[0].y * VH;

const CYCLE = 6;
// The keyframe lights the card at 8% of its cycle; offset each node so its lit
// moment coincides with the highlight band (which sweeps left to right) reaching it.
function nodeDelay(i: number) {
  const f = NODES[i].x;
  const mod = (((0.08 - f) % 1) + 1) % 1;
  return `${-(CYCLE * mod)}s`;
}

function FlowChip({ node, index }: { node: FlowNode; index: number }) {
  const Icon = node.icon;

  return (
    <div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${node.x * 100}%`, top: `${node.y * 100}%` }}
    >
      <div
        className="flow-node flex w-32 flex-col items-center gap-2 rounded-2xl border border-white/10 bg-surface-elevated/80 px-4 py-3 backdrop-blur-sm"
        style={{ animationDelay: nodeDelay(index) }}
      >
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            node.orchestrator ? "bg-accent/10 text-accent" : "bg-white/5 text-muted",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="text-center">
          <p className="truncate text-sm font-semibold leading-tight">{node.label}</p>
          {node.sublabel && <p className="truncate text-xs text-muted">{node.sublabel}</p>}
        </div>
      </div>
    </div>
  );
}

export function OrchestrationFlow() {
  return (
    <div className="relative hidden h-[220px] w-full overflow-hidden lg:block">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          {/* A narrow accent band that sweeps across, lighting dashes one by one */}
          <linearGradient id="flow-sweep" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={VW} y2="0">
            <stop offset="0" stopColor="#b8a4ed" stopOpacity="0">
              <animate attributeName="offset" values="-0.07;0.93" dur={`${CYCLE}s`} repeatCount="indefinite" />
            </stop>
            <stop offset="0" stopColor="#b8a4ed" stopOpacity="1">
              <animate attributeName="offset" values="0;1" dur={`${CYCLE}s`} repeatCount="indefinite" />
            </stop>
            <stop offset="0" stopColor="#b8a4ed" stopOpacity="0">
              <animate attributeName="offset" values="0.07;1.07" dur={`${CYCLE}s`} repeatCount="indefinite" />
            </stop>
          </linearGradient>
        </defs>

        {/* Dim dashed track */}
        <line
          x1={TRACK_START}
          y1={TRACK_Y}
          x2={TRACK_END}
          y2={TRACK_Y}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={1.5}
          strokeDasharray="7 7"
        />
        {/* Accent highlight that travels through the dashes */}
        <line
          x1={TRACK_START}
          y1={TRACK_Y}
          x2={TRACK_END}
          y2={TRACK_Y}
          stroke="url(#flow-sweep)"
          strokeWidth={2.5}
          strokeDasharray="7 7"
          className="motion-reduce:hidden"
        />
      </svg>

      {NODES.map((node, i) => (
        <FlowChip key={node.id} node={node} index={i} />
      ))}
    </div>
  );
}

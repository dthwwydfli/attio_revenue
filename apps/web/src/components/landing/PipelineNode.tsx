import type { WorkflowNode as WorkflowNodeType } from "./landing-data";
import { cn } from "@/lib/utils";

interface PipelineNodeProps {
  node: WorkflowNodeType;
  showConnector?: boolean;
  vertical?: boolean;
}

export function PipelineNode({ node, showConnector = true, vertical = false }: PipelineNodeProps) {
  const Icon = node.icon;

  return (
    <div
      className={cn(
        "flex items-center",
        vertical ? "flex-row gap-4" : "flex-col sm:flex-row sm:gap-0",
      )}
    >
      <div
        className={cn(
          "relative flex flex-col items-center rounded-2xl border px-4 py-3 transition-all duration-300",
          node.active
            ? "border-accent/40 bg-accent/10 shadow-[0_0_30px_-5px_rgba(184,164,237,0.35)]"
            : "border-white/10 bg-surface-elevated/80 hover:border-white/20",
          vertical ? "w-full flex-row gap-3 sm:w-auto sm:flex-col" : "min-w-[100px]",
        )}
      >
        <div
          className={cn(
            "mb-1 flex h-8 w-8 items-center justify-center rounded-lg",
            node.active ? "bg-accent/20 text-accent" : "bg-white/5 text-muted",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className={cn("text-center", vertical && "text-left sm:text-center")}>
          <p className="text-sm font-semibold">{node.label}</p>
          {node.sublabel && <p className="text-xs text-muted">{node.sublabel}</p>}
        </div>
        {node.active && (
          <span className="absolute -top-1 -right-1 rounded-full border border-accent/40 bg-accent/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent">
            Live
          </span>
        )}
      </div>

      {showConnector && (
        <div
          className={cn(
            "flex items-center justify-center",
            vertical
              ? "ml-8 h-8 w-px bg-gradient-to-b from-accent/50 to-white/10 motion-safe:animate-flow-pulse"
              : "hidden h-px w-6 bg-gradient-to-r from-accent/50 to-white/10 motion-safe:animate-flow-pulse sm:block md:w-10 lg:w-14",
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

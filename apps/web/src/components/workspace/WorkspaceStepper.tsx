import type { LeadRun } from "@leadloop/shared";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WORKSPACE_STEPS,
  getWorkspaceStepState,
  isProcessing,
} from "@/lib/workspace-utils";

interface WorkspaceStepperProps {
  run: LeadRun;
}

export function WorkspaceStepper({ run }: WorkspaceStepperProps) {
  const { activeIndex, completedIndices } = getWorkspaceStepState(run);
  const processing = isProcessing(run);

  return (
    <ol
      className="flex flex-wrap gap-2"
      aria-label="Lead processing pipeline"
    >
      {WORKSPACE_STEPS.map((step, idx) => {
        const isComplete =
          completedIndices.has(idx) ||
          (run.status === "completed" && idx <= WORKSPACE_STEPS.length - 1);
        const isActive = idx === activeIndex && processing;

        return (
          <li key={step.key}>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200",
                isComplete && !isActive && "bg-accent/10 text-accent",
                isActive && "bg-accent/20 text-accent ring-1 ring-accent/30",
                !isComplete && !isActive && "bg-white/5 text-muted",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isComplete && !isActive ? (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <span className="text-[10px] opacity-60" aria-hidden>
                  ·
                </span>
              )}
              {step.label}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

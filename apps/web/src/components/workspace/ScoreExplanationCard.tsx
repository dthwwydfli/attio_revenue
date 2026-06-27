import type { ScoreResult } from "@leadloop/shared";
import { Target } from "lucide-react";
import { ScoreBadge } from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";

interface ScoreExplanationCardProps {
  score?: ScoreResult;
  variant?: "default" | "dense";
}

export function ScoreExplanationCard({ score, variant = "default" }: ScoreExplanationCardProps) {
  if (!score) return null;

  const dense = variant === "dense";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-background/50",
        dense ? "p-3" : "p-5",
      )}
    >
      <div className={cn("flex items-center justify-between gap-2", dense ? "mb-2" : "mb-3")}>
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-lavender" aria-hidden />
          <h3 className="text-sm font-semibold">
            {dense ? "Why this score" : "Lead score"}
          </h3>
        </div>
        <ScoreBadge band={score.band} score={score.score} className="text-xs" />
      </div>

      <ul className={cn("space-y-2 text-muted", dense ? "text-xs" : "text-sm")}>
        {score.rankReasons.map((reason) => (
          <li key={reason} className="flex gap-2 leading-relaxed">
            <span className="text-accent" aria-hidden>
              ·
            </span>
            {reason}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-muted/70">
        via {score.source === "mock" ? "demo fixture" : score.source}
      </p>
    </div>
  );
}

import { HERO_PREVIEW } from "./landing-data";
import { ScoreBadge } from "@/components/ScoreBadge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Sparkles } from "lucide-react";

export function HeroPreviewCard() {
  const { name, role, company, scoreBand, score, pipelineSteps, activeStep, enrichment, reply } =
    HERO_PREVIEW;

  return (
    <div className="relative">
      <div
        className="absolute -inset-4 rounded-clay bg-gradient-to-br from-accent/20 via-accent-lavender/10 to-accent-pink/10 blur-2xl"
        aria-hidden
      />
      <div className="glass-panel relative overflow-hidden rounded-clay p-6 shadow-2xl">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-accent-mint/10 blur-2xl" aria-hidden />

        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold">{name}</p>
            <p className="text-sm text-muted">
              {role} · {company}
            </p>
          </div>
          <ScoreBadge band={scoreBand} score={score} />
        </div>

        <div className="mb-5 flex flex-wrap gap-1.5">
          {pipelineSteps.map((step, idx) => {
            const isDone = idx < activeStep;
            const isActive = idx === activeStep;
            return (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium",
                  isDone && "bg-accent/10 text-accent",
                  isActive && "bg-accent/20 text-accent ring-1 ring-accent/30",
                  !isDone && !isActive && "bg-white/5 text-muted",
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                ) : (
                  <span className="text-[10px] opacity-60" aria-hidden>
                    ·
                  </span>
                )}
                {step}
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/5 bg-background/50 p-3">
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent-mint">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Enrichment
            </div>
            <p className="text-sm text-muted leading-relaxed">{enrichment}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-background/50 p-3">
            <div className="mb-1 text-xs font-medium text-accent-peach">Generated reply</div>
            <p className="text-sm text-muted leading-relaxed line-clamp-2">{reply}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-white/5 pt-4 text-xs text-muted">
          Agent loop running · Attio writeback pending
        </div>
      </div>
    </div>
  );
}

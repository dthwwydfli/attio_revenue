import type { EnrichmentResult } from "@leadloop/shared";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnrichmentCardProps {
  enrichment: EnrichmentResult;
  variant?: "default" | "dense";
}

export function EnrichmentCard({ enrichment, variant = "default" }: EnrichmentCardProps) {
  const dense = variant === "dense";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-background/50 space-y-3",
        dense ? "p-3" : "p-5",
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className={cn("text-accent-mint", dense ? "h-4 w-4" : "h-4 w-4")} aria-hidden />
        <h3 className={cn("font-semibold", dense ? "text-sm" : "")}>Enrichment</h3>
      </div>
      <p className={cn("text-muted", dense ? "text-xs leading-relaxed" : "text-sm")}>
        {enrichment.description ?? "No description available."}
      </p>
      <div className="flex flex-wrap gap-1.5 text-xs">
        {enrichment.industry && (
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">{enrichment.industry}</span>
        )}
        {enrichment.employee_band && (
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">{enrichment.employee_band}</span>
        )}
        {enrichment.domain && (
          <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">{enrichment.domain}</span>
        )}
        <span className="rounded bg-white/5 px-2 py-0.5 text-[10px]">via {enrichment.source}</span>
      </div>
      {enrichment.news.length > 0 && (
        <ul className={cn("list-disc pl-4 text-muted", dense ? "text-[10px] space-y-0.5" : "text-sm")}>
          {enrichment.news.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

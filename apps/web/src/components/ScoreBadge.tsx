import { bandColor, cn } from "@/lib/utils";

interface ScoreBadgeProps {
  band?: string;
  score?: number;
  className?: string;
}

export function ScoreBadge({ band, score, className }: ScoreBadgeProps) {
  if (!band) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium capitalize",
        bandColor(band),
        className,
      )}
    >
      {band.replace("_", " ")}
      {score !== undefined && <span className="opacity-70">{score}/100</span>}
    </span>
  );
}

import type { SlngResult } from "@leadloop/shared";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";

const labels: Record<string, string> = {
  skipped: "Voice skipped",
  web_session_started: "Voice agent engaged",
  call_completed: "Call completed",
  failed: "Voice failed",
};

interface SLNGCallStatusProps {
  slng: SlngResult;
  variant?: "default" | "dense";
}

export function SLNGCallStatus({ slng, variant = "default" }: SLNGCallStatusProps) {
  if (slng.status === "skipped") return null;

  const dense = variant === "dense";

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-background/50",
        dense ? "p-3 space-y-2" : "rounded-lg border-border bg-card p-4 space-y-2",
      )}
    >
      <div className="flex items-center gap-2">
        <Phone className="h-4 w-4 text-accent-peach" aria-hidden />
        <h3 className={cn("font-semibold", dense ? "text-sm" : "")}>SLNG Voice</h3>
        <span className="ml-auto flex items-center gap-1 text-[10px] text-accent">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          Live
        </span>
      </div>
      <p className={cn("capitalize", dense ? "text-xs" : "text-sm")}>
        {labels[slng.status] ?? slng.status}
      </p>
      {slng.transcriptSnippet && (
        <p className={cn("text-muted", dense ? "text-xs leading-relaxed" : "text-sm")}>
          {slng.transcriptSnippet}
        </p>
      )}
      {slng.roomUrl && (
        <a
          href={slng.roomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Open voice session →
        </a>
      )}
    </div>
  );
}

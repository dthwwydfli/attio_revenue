import type { SlngResult } from "@leadloop/shared";
import { Phone } from "lucide-react";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { cn } from "@/lib/utils";
import {
  canOpenVoiceSession,
  hasLiveSlngSession,
  isDemoSlngSession,
  voiceSessionPath,
} from "@/lib/slng-utils";

const labels: Record<string, string> = {
  skipped: "Voice skipped",
  web_session_started: "Voice agent engaged",
  call_completed: "Call completed",
  failed: "Voice failed",
};

interface SLNGCallStatusProps {
  slng: SlngResult;
  leadId: string;
  variant?: "default" | "dense";
}

export function SLNGCallStatus({ slng, leadId, variant = "default" }: SLNGCallStatusProps) {
  if (slng.status === "skipped") return null;

  const dense = variant === "dense";
  const isDemo = isDemoSlngSession(slng);
  const isLive = hasLiveSlngSession(slng);
  const showLink = canOpenVoiceSession(slng);

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
        <span className={cn("ml-auto text-[10px] font-medium", isLive ? "text-accent" : "text-muted")}>
          {isLive ? "Live" : "Demo"}
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
      {showLink && (
        <Link
          href={voiceSessionPath(leadId)}
          className="inline-flex items-center gap-1 text-xs text-accent transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {isLive ? "Open voice session" : "View voice session (demo)"}
          <ArrowIcon className="h-3.5 w-3.5" />
        </Link>
      )}
      {isDemo && (
        <p className={cn("text-muted", dense ? "text-xs" : "text-sm")}>
          Live voice requires real SLNG keys. Check Integrations for connection status.
        </p>
      )}
    </div>
  );
}

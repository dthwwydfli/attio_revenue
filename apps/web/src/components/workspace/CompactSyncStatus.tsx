import type { AttioWriteback, SlngResult } from "@leadloop/shared";
import { Database, Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactSyncStatusProps {
  attio?: AttioWriteback;
  slng?: SlngResult;
}

export function CompactSyncStatus({ attio, slng }: CompactSyncStatusProps) {
  const attioSynced = attio && !attio.skipped && Boolean(attio.personRecordId);
  const attioSkipped = attio?.skipped;
  const slngActive = slng && slng.status !== "skipped";

  if (!attio && !slngActive) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
      {attio && (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
            attioSynced
              ? "border-accent/20 bg-accent/5 text-accent"
              : attioSkipped
                ? "border-amber-400/20 bg-amber-400/5 text-amber-400"
                : "border-white/5 bg-white/5",
          )}
        >
          <Database className="h-3.5 w-3.5" aria-hidden />
          Attio
          {attioSynced ? (
            <CheckCircle2 className="h-3 w-3" aria-hidden />
          ) : attioSkipped ? (
            <AlertCircle className="h-3 w-3" aria-hidden />
          ) : null}
        </span>
      )}
      {slngActive && (
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1.5 text-accent">
          <Phone className="h-3.5 w-3.5" aria-hidden />
          SLNG voice
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full motion-safe:animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
        </span>
      )}
    </div>
  );
}

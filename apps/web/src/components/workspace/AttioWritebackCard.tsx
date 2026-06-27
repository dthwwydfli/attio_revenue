import type { AttioWriteback } from "@leadloop/shared";
import { Database, CheckCircle2, AlertCircle } from "lucide-react";
import { AttioRecordLink } from "@/components/AttioRecordLink";
import { cn } from "@/lib/utils";

interface AttioWritebackCardProps {
  attio?: AttioWriteback;
  variant?: "default" | "dense";
}

export function AttioWritebackCard({ attio, variant = "default" }: AttioWritebackCardProps) {
  if (!attio) return null;

  const dense = variant === "dense";
  const synced = !attio.skipped && Boolean(attio.personRecordId);

  return (
    <div
      className={cn(
        "rounded-xl border border-white/5 bg-background/50",
        dense ? "p-3" : "p-5",
      )}
    >
      <div className={cn("flex items-center gap-2", dense ? "mb-2" : "mb-3")}>
        <Database className="h-4 w-4 text-accent" aria-hidden />
        <h3 className="text-sm font-semibold">Attio writeback</h3>
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
            synced
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-amber-400/30 bg-amber-400/10 text-amber-400",
          )}
        >
          {synced ? (
            <>
              <CheckCircle2 className="h-3 w-3" aria-hidden />
              Synced
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" aria-hidden />
              Skipped
            </>
          )}
        </span>
      </div>

      {attio.skipped && attio.reason && (
        <p className={cn("text-muted", dense ? "mb-2 text-xs" : "mb-3 text-sm")}>
          {attio.reason}
        </p>
      )}

      <dl className={cn("space-y-1.5 font-mono text-muted", dense ? "text-[10px]" : "text-xs")}>
        {attio.personRecordId && (
          <div className="flex justify-between gap-2">
            <dt>Person</dt>
            <dd className="truncate text-foreground/70">{attio.personRecordId}</dd>
          </div>
        )}
        {attio.noteId && (
          <div className="flex justify-between gap-2">
            <dt>Note</dt>
            <dd className="truncate text-foreground/70">{attio.noteId}</dd>
          </div>
        )}
        {attio.taskId && (
          <div className="flex justify-between gap-2">
            <dt>Task</dt>
            <dd className="truncate text-foreground/70">{attio.taskId}</dd>
          </div>
        )}
      </dl>

      {attio.personUrl && (
        <div className={dense ? "mt-2" : "mt-4"}>
          <AttioRecordLink
            url={attio.personUrl}
            label="Open in Attio"
            variant={dense ? "link" : "button"}
          />
        </div>
      )}
    </div>
  );
}

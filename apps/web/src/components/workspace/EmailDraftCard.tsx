"use client";

import type { GeneratedAction } from "@leadloop/shared";
import { useState } from "react";
import { Copy, Mail, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEmailBody } from "@/lib/workspace-utils";

interface EmailDraftCardProps {
  action?: GeneratedAction;
  band?: string;
  className?: string;
}

const PREVIEW_LINES = 3;

function previewBody(body: string): string {
  const lines = body.split("\n").filter(Boolean);
  const preview = lines.slice(0, PREVIEW_LINES).join("\n");
  return lines.length > PREVIEW_LINES ? `${preview}\n…` : preview;
}

export function EmailDraftCard({ action, band, className }: EmailDraftCardProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (!action?.replyBody) return null;

  const body = formatEmailBody(action.replyBody);

  const copy = async () => {
    await navigator.clipboard.writeText(`${action.replySubject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isNurture = band === "cold";
  const hasMore = body.split("\n").filter(Boolean).length > PREVIEW_LINES;

  return (
    <div
      className={cn(
        "glass-panel rounded-xl p-5 md:p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent-peach" aria-hidden />
          <h2 className="text-sm font-semibold">
            {isNurture ? "Nurture reply" : "Email draft"}
          </h2>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy email draft"
          className={cn(
            "inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs transition-colors duration-200",
            "hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <p className="text-sm font-medium">{action.replySubject}</p>

      <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
        {expanded ? body : previewBody(body)}
      </pre>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={cn(
            "mt-3 inline-flex min-h-[36px] cursor-pointer items-center gap-1 text-xs font-medium text-accent transition-colors duration-200",
            "hover:text-accent/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          )}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
              View full draft
            </>
          )}
        </button>
      )}

      {action.taskTitle && (
        <div className="mt-5 border-t border-white/5 pt-4 text-sm">
          <p className="font-medium">{action.taskTitle}</p>
          {action.taskBody && (
            <p className="mt-1 text-muted">{action.taskBody}</p>
          )}
        </div>
      )}
    </div>
  );
}

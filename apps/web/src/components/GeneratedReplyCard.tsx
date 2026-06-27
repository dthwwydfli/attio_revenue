"use client";

import { useState } from "react";
import type { GeneratedAction } from "@leadloop/shared";

export function GeneratedReplyCard({ action }: { action: GeneratedAction }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(`${action.replySubject}\n\n${action.replyBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Generated Reply</h3>
        <button
          onClick={copy}
          className="text-xs rounded border border-border px-2 py-1 hover:bg-border transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-sm font-medium">{action.replySubject}</p>
      <pre className="whitespace-pre-wrap text-sm text-muted font-sans">{action.replyBody}</pre>
      {action.taskTitle && (
        <div className="border-t border-border pt-3 text-sm">
          <p className="font-medium">Task: {action.taskTitle}</p>
          {action.taskBody && <p className="text-muted">{action.taskBody}</p>}
        </div>
      )}
      <p className="text-xs text-muted italic">{action.rationale}</p>
    </div>
  );
}

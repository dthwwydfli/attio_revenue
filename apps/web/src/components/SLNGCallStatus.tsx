import type { SlngResult } from "@leadloop/shared";

export function SLNGCallStatus({ slng }: { slng: SlngResult }) {
  const labels: Record<string, string> = {
    skipped: "Voice skipped",
    web_session_started: "Voice agent engaged",
    call_completed: "Call completed",
    failed: "Voice failed",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <h3 className="font-semibold">SLNG Voice</h3>
      <p className="text-sm capitalize">{labels[slng.status] ?? slng.status}</p>
      {slng.transcriptSnippet && (
        <p className="text-sm text-muted">{slng.transcriptSnippet}</p>
      )}
      {slng.roomUrl && (
        <a
          href={slng.roomUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent hover:underline"
        >
          Open voice session
        </a>
      )}
    </div>
  );
}

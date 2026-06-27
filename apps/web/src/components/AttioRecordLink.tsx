export function AttioRecordLink({ url, label }: { url?: string; label?: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent/90 transition-colors"
    >
      {label ?? "Open in Attio"} →
    </a>
  );
}

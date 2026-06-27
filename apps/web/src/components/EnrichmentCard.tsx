import type { EnrichmentResult } from "@leadloop/shared";

export function EnrichmentCard({ enrichment }: { enrichment: EnrichmentResult }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2">
      <h3 className="font-semibold">Enrichment</h3>
      <p className="text-sm text-muted">{enrichment.description}</p>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-border px-2 py-1">{enrichment.industry}</span>
        <span className="rounded bg-border px-2 py-1">{enrichment.employeeBand} employees</span>
        <span className="rounded bg-border px-2 py-1">{enrichment.domain}</span>
        <span className="rounded bg-border px-2 py-1">via {enrichment.source}</span>
      </div>
      {enrichment.news.length > 0 && (
        <ul className="text-sm list-disc pl-4 text-muted">
          {enrichment.news.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

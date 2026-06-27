import { apiFetch } from "@/lib/api-client";

export default async function IcpPage() {
  let icp = { description: "Loading…" };
  try {
    icp = await apiFetch<{ description: string }>("/icp");
  } catch {
    icp = { description: "API unavailable" };
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">Ideal Customer Profile</h1>
      <p className="text-sm text-muted">
        Leads are scored against this ICP using Superlinked semantic reranking (with mock fallback).
      </p>
      <div className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed">
        {icp.description}
      </div>
    </div>
  );
}

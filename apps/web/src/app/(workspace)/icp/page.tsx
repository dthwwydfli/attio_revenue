import { apiFetch } from "@/lib/api-client";
import { WorkspacePageContent } from "@/components/workspace/WorkspacePageContent";

export default async function IcpPage() {
  let icp = { description: "Loading…" };
  try {
    icp = await apiFetch<{ description: string }>("/icp");
  } catch {
    icp = { description: "API unavailable" };
  }

  return (
    <WorkspacePageContent maxWidth="lg" className="space-y-10">
      <header className="space-y-2 border-b border-white/5 pb-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Ideal Customer Profile
        </h1>
        <p className="text-sm text-muted">
          Leads are scored against this ICP using Superlinked semantic reranking (with mock
          fallback).
        </p>
      </header>

      <div className="glass-panel rounded-xl p-5 text-sm leading-relaxed md:p-6">
        {icp.description}
      </div>
    </WorkspacePageContent>
  );
}

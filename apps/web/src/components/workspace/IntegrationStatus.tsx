"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Health = {
  ok?: boolean;
  attio?: boolean;
  tavily?: boolean;
  gemini?: boolean;
  slng?: boolean;
  sie?: string;
};

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        ok
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400",
      )}
      title={ok ? `${label} connected` : `${label} not configured`}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")}
        aria-hidden
      />
      {label}
    </span>
  );
}

export function IntegrationStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<Health>("/health")
      .then((data) => {
        if (active) {
          setHealth(data);
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <div
        className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        role="alert"
      >
        API offline — start with <code className="text-red-300">pnpm dev</code>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-muted">
        Checking integrations…
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">
        Live integrations
      </p>
      <div className="flex flex-wrap gap-1.5">
        <StatusDot ok={Boolean(health.attio)} label="Attio" />
        <StatusDot ok={Boolean(health.tavily)} label="Enrichment" />
        <StatusDot ok={Boolean(health.gemini)} label="Gemini" />
        <StatusDot ok={Boolean(health.sie)} label="SIE" />
        <StatusDot ok={Boolean(health.slng)} label="SLNG" />
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Health = {
  ok?: boolean;
  attio?: boolean;
  tavily?: boolean;
  serper?: boolean;
  gemini?: boolean;
  openai?: boolean;
  anthropic?: boolean;
  slng?: boolean;
  sie?: boolean;
  n8n?: boolean;
};

const INTEGRATIONS: { key: keyof Health; label: string }[] = [
  { key: "attio", label: "Attio" },
  { key: "tavily", label: "Tavily" },
  { key: "serper", label: "Serper" },
  { key: "gemini", label: "Gemini" },
  { key: "sie", label: "SIE" },
  { key: "openai", label: "OpenAI" },
  { key: "anthropic", label: "Anthropic" },
  { key: "slng", label: "SLNG" },
  { key: "n8n", label: "n8n" },
];

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        ok
          ? "border-white/15 bg-white/5 text-foreground/80"
          : "border-amber-500/30 bg-amber-500/10 text-amber-400",
      )}
      title={ok ? `${label} connected` : `${label} not configured`}
    >
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
        API offline. Start with <code className="text-red-300">pnpm dev:api</code>
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
        {INTEGRATIONS.map(({ key, label }) => (
          <StatusBadge key={key} ok={Boolean(health[key])} label={label} />
        ))}
      </div>
    </div>
  );
}

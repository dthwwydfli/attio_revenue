"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Flame, Snowflake, Sun } from "lucide-react";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { cn } from "@/lib/utils";

const SCENARIOS = [
  {
    scenario: "hot" as const,
    title: "Hot lead",
    desc: "VP RevOps: voice and Attio",
    icon: Flame,
  },
  {
    scenario: "warm" as const,
    title: "Warm lead",
    desc: "Head of Sales: email and task",
    icon: Sun,
  },
  {
    scenario: "cold" as const,
    title: "Cold lead",
    desc: "Small retail: nurture only",
    icon: Snowflake,
  },
];

export function ReplayShortcuts({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const replay = async (scenario: "hot" | "warm" | "cold") => {
    setLoading(scenario);
    setError(null);
    try {
      const res = await fetch(`/api/replay/${scenario}`, { method: "POST" });
      const data = (await res.json()) as { leadRunId?: string; error?: string };
      if (!res.ok || !data.leadRunId) {
        throw new Error(data.error ?? "Replay failed. Is the API running?");
      }
      router.push(`/console?leadId=${data.leadRunId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Replay failed");
      setLoading(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted">
        Instant replay
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {SCENARIOS.map(({ scenario, title, desc, icon: Icon }) => (
          <button
            key={scenario}
            type="button"
            disabled={loading !== null}
            onClick={() => void replay(scenario)}
            className={cn(
              "min-h-[44px] cursor-pointer rounded-xl border border-white/10 bg-white/5 p-3 text-left transition-colors",
              "hover:border-accent/40 hover:bg-accent/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 shrink-0 text-accent" aria-hidden />
              <span className="text-sm font-semibold">{title}</span>
            </div>
            <p className="mt-1 text-xs text-muted">{desc}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-accent">
              {loading === scenario ? "Running…" : "Replay"}
              {!loading && <ArrowIcon className="h-3.5 w-3.5" />}
            </span>
          </button>
        ))}
      </div>
      {error && (
        <StatusBanner variant="error" onDismiss={() => setError(null)} live="assertive">
          {error}
        </StatusBanner>
      )}
    </div>
  );
}

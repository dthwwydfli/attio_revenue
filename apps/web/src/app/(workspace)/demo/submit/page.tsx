"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_LEADS } from "@leadloop/shared";
import { apiFetch } from "@/lib/api-client";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { WorkspacePageContent } from "@/components/workspace/WorkspacePageContent";

const REPLAY_SCENARIOS = [
  {
    scenario: "hot" as const,
    title: "Hot lead",
    desc: "VP RevOps at B2B SaaS — voice + Attio writeback",
  },
  {
    scenario: "warm" as const,
    title: "Warm lead",
    desc: "Head of Sales — email + task",
  },
  {
    scenario: "cold" as const,
    title: "Cold lead",
    desc: "Small retail — nurture only",
  },
];

export default function SubmitLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
    phone: "",
  });

  const [replayLoading, setReplayLoading] = useState<string | null>(null);

  const fillDemo = (scenario: "hot" | "warm" | "cold") => {
    const lead = DEMO_LEADS[scenario];
    setForm({
      name: lead.name,
      email: lead.email,
      company: lead.company,
      role: lead.role ?? "",
      message: lead.message ?? "",
      phone: lead.phone ?? "",
    });
    setSubmitError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);
    try {
      const result = await apiFetch<{ leadRunId: string }>("/leads/process", {
        method: "POST",
        body: JSON.stringify({ ...form, source: "demo_form" }),
      });
      router.push(`/console?leadId=${result.leadRunId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
      setLoading(false);
    }
  };

  const replayScenario = async (scenario: "hot" | "warm" | "cold") => {
    setReplayLoading(scenario);
    setReplayError(null);
    try {
      const res = await fetch(`/api/replay/${scenario}`, { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Replay failed (${res.status})`);
      }
      const result = (await res.json()) as { leadRunId: string };
      router.push(`/console?leadId=${result.leadRunId}`);
    } catch (err) {
      setReplayError(err instanceof Error ? err.message : "Replay failed");
      setReplayLoading(null);
    }
  };

  return (
    <WorkspacePageContent maxWidth="lg" className="space-y-10">
      <header className="space-y-2 border-b border-white/5 pb-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Submit Demo Lead
        </h1>
        <p className="text-sm text-muted">Triggers the full autonomous pipeline.</p>
      </header>

      <section className="glass-panel space-y-4 rounded-xl p-5 md:p-6">
        <h2 className="text-sm font-semibold">Quick-fill scenarios</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {(["hot", "warm", "cold"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => fillDemo(s)}
              className="cursor-pointer rounded-lg border border-white/10 px-3 py-1.5 text-xs capitalize transition-colors hover:border-accent/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Demo {s}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-panel space-y-4 rounded-xl p-5 md:p-6">
        <h2 className="text-sm font-semibold">Instant replay</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {REPLAY_SCENARIOS.map(({ scenario, title, desc }) => (
            <button
              key={scenario}
              type="button"
              disabled={replayLoading !== null}
              onClick={() => replayScenario(scenario)}
              className="h-full w-full min-h-[44px] cursor-pointer rounded-lg border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-accent/50 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
            >
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{desc}</p>
              <p className="mt-2 text-xs text-accent">
                {replayLoading === scenario ? "Running…" : "Replay →"}
              </p>
            </button>
          ))}
        </div>
        {replayError && (
          <StatusBanner variant="error" onDismiss={() => setReplayError(null)} live="assertive">
            {replayError}
          </StatusBanner>
        )}
      </section>

      <form onSubmit={submit} className="glass-panel space-y-4 rounded-xl p-5 md:p-6">
        <h2 className="text-sm font-semibold">Manual submission</h2>
        {(["name", "email", "company", "role", "phone"] as const).map((field) => (
          <label key={field} className="block space-y-1">
            <span className="text-sm capitalize text-muted">{field}</span>
            <input
              required={field === "name" || field === "email" || field === "company"}
              type={field === "email" ? "email" : "text"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm focus:border-accent focus-visible:outline-none"
            />
          </label>
        ))}
        <label className="block space-y-1">
          <span className="text-sm text-muted">Message</span>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm focus:border-accent focus-visible:outline-none"
          />
        </label>

        {submitError && (
          <StatusBanner variant="error" onDismiss={() => setSubmitError(null)} live="assertive">
            {submitError}
          </StatusBanner>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[44px] cursor-pointer rounded-lg bg-accent py-2.5 text-sm font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {loading ? "Processing…" : "Run agent pipeline"}
        </button>
      </form>
    </WorkspacePageContent>
  );
}

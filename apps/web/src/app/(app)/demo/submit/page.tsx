"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_LEADS } from "@leadloop/shared";
import { apiFetch } from "@/lib/api-client";

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
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    message: "",
    phone: "",
  });

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
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await apiFetch<{ leadRunId: string }>("/leads/process", {
        method: "POST",
        body: JSON.stringify({ ...form, source: "demo_form" }),
      });
      router.push(`/demo?leadId=${result.leadRunId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Submit failed");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Submit Demo Lead</h1>
        <p className="text-muted text-sm mt-1">Triggers the full autonomous pipeline.</p>
      </div>

      <section className="space-y-3">
        <p className="text-sm font-medium">Quick-fill scenarios</p>
        <div className="flex flex-wrap gap-2">
          {(["hot", "warm", "cold"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => fillDemo(s)}
              className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs capitalize transition-colors hover:border-accent/50 hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Demo {s}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-sm font-medium">Instant replay</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {REPLAY_SCENARIOS.map(({ scenario, title, desc }) => (
            <form key={scenario} action={`/api/replay/${scenario}`} method="POST">
              <button
                type="submit"
                className="h-full w-full cursor-pointer rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <p className="font-semibold">{title}</p>
                <p className="text-sm text-muted mt-1">{desc}</p>
                <p className="text-xs text-accent mt-2">Replay →</p>
              </button>
            </form>
          ))}
        </div>
      </section>

      <form onSubmit={submit} className="space-y-4">
        {(["name", "email", "company", "role", "phone"] as const).map((field) => (
          <label key={field} className="block space-y-1">
            <span className="text-sm capitalize">{field}</span>
            <input
              required={field === "name" || field === "email" || field === "company"}
              type={field === "email" ? "email" : "text"}
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-accent focus-visible:outline-none"
            />
          </label>
        ))}
        <label className="block space-y-1">
          <span className="text-sm">Message</span>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-accent focus-visible:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-lg bg-accent py-2.5 text-sm font-medium text-black transition-colors hover:bg-accent/90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {loading ? "Processing…" : "Run agent pipeline"}
        </button>
      </form>
    </div>
  );
}

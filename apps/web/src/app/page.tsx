import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

export default async function HomePage() {
  let health: { ok?: boolean; slng?: boolean; slngAgent?: boolean } = {};
  try {
    health = await apiFetch("/health");
  } catch {
    health = { ok: false };
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <p className="text-accent text-sm font-medium uppercase tracking-wider">Tech: Europe AI Hackathon</p>
        <h1 className="text-4xl font-bold tracking-tight">
          The CRM acts. Humans review exceptions.
        </h1>
        <p className="text-lg text-muted max-w-2xl">
          LeadLoop turns inbound leads into autonomous CRM action loops—enriched, scored against your ICP
          with Superlinked, routed with LLM-generated replies, voice touchpoints via SLNG, and written back
          to Attio automatically. Orchestrated by n8n.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/demo/submit"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-black hover:bg-accent/90"
          >
            Submit demo lead
          </Link>
          <Link
            href="/demo"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-card"
          >
            Live pipeline
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {(["hot", "warm", "cold"] as const).map((scenario) => (
          <ReplayCard key={scenario} scenario={scenario} />
        ))}
      </section>

      <section className="rounded-lg border border-border bg-card p-4 text-sm space-y-1">
        <p>
          API status:{" "}
          <span className={health.ok ? "text-accent" : "text-red-400"}>
            {health.ok ? "online" : "offline — start with pnpm dev:api"}
          </span>
        </p>
        {health.ok && (
          <p className="text-muted">
            SLNG: {health.slng ? "API key OK" : "not configured"}
            {health.slngAgent ? " · voice agent ready" : health.slng ? " · create agent with pnpm slng:setup" : ""}
          </p>
        )}
      </section>

      <section className="flex flex-wrap gap-4 text-xs text-muted uppercase tracking-wide">
        {["Attio", "n8n", "Superlinked", "SLNG", "Aikido"].map((s) => (
          <span key={s} className="rounded border border-border px-3 py-1">
            {s}
          </span>
        ))}
      </section>
    </div>
  );
}

function ReplayCard({ scenario }: { scenario: "hot" | "warm" | "cold" }) {
  const labels = {
    hot: { title: "Hot lead", desc: "VP RevOps at B2B SaaS — voice + Attio writeback" },
    warm: { title: "Warm lead", desc: "Head of Sales — email + task" },
    cold: { title: "Cold lead", desc: "Small retail — nurture only" },
  };

  return (
    <form action={`/api/replay/${scenario}`} method="POST">
      <button
        type="submit"
        className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-accent/50 transition-colors"
      >
        <p className="font-semibold capitalize">{labels[scenario].title}</p>
        <p className="text-sm text-muted mt-1">{labels[scenario].desc}</p>
        <p className="text-xs text-accent mt-2">Replay →</p>
      </button>
    </form>
  );
}

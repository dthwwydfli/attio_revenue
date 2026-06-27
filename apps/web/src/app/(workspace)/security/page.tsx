import { WorkspacePageContent } from "@/components/workspace/WorkspacePageContent";

export default function SecurityPage() {
  return (
    <WorkspacePageContent maxWidth="lg" className="space-y-10">
      <header className="space-y-2 border-b border-white/5 pb-8 text-center">
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-[1.75rem]">
          Security — Aikido
        </h1>
        <p className="text-sm text-muted">
          LeadLoop uses Aikido Security to scan dependencies and secrets on every pull request.
        </p>
      </header>

      <div className="glass-panel space-y-4 rounded-xl p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
            Aikido CI
          </span>
          <span className="text-sm text-muted">github/workflows/aikido.yml</span>
        </div>

        <ul className="list-disc space-y-2 pl-4 text-sm text-muted">
          <li>Open source dependency scanning (SCA)</li>
          <li>Secrets detection</li>
          <li>Runs on pull requests to main</li>
        </ul>

        <p className="text-sm">
          Connect your repo in{" "}
          <a
            href="https://www.aikido.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Aikido Dashboard
          </a>{" "}
          and add <code className="rounded bg-white/10 px-1 text-xs">AIKIDO_SECRET_KEY</code> to
          GitHub secrets.
        </p>
      </div>

      <div className="glass-panel rounded-xl border-amber-400/30 bg-amber-400/5 p-5 text-sm md:p-6">
        <p className="font-medium text-amber-400">Demo tip</p>
        <p className="mt-1 text-muted">
          Show the green Aikido check on your PR or the Aikido dashboard during the last 15 seconds
          of your pitch.
        </p>
      </div>
    </WorkspacePageContent>
  );
}

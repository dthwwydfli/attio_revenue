export default function SecurityPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Security — Aikido</h1>
      <p className="text-muted text-sm">
        LeadLoop uses Aikido Security to scan dependencies and secrets on every pull request.
      </p>

      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent/20 text-accent px-3 py-1 text-xs font-medium">
            Aikido CI
          </span>
          <span className="text-sm text-muted">github/workflows/aikido.yml</span>
        </div>

        <ul className="text-sm space-y-2 text-muted list-disc pl-4">
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
          and add <code className="text-xs bg-border px-1 rounded">AIKIDO_SECRET_KEY</code> to GitHub
          secrets.
        </p>
      </div>

      <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-4 text-sm">
        <p className="font-medium text-amber-400">Demo tip</p>
        <p className="text-muted mt-1">
          Show the green Aikido check on your PR or the Aikido dashboard during the last 15 seconds of
          your pitch.
        </p>
      </div>
    </div>
  );
}

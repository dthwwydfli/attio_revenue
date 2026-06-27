import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-muted">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-muted">
        This route doesn&apos;t exist. Head back to the dashboard or submit a new lead.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-card"
        >
          Home
        </Link>
        <Link
          href="/demo"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/90"
        >
          Live pipeline
        </Link>
      </div>
    </div>
  );
}

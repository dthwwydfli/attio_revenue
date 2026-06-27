import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Console" },
  { href: "/demo/submit", label: "Submit Lead" },
  { href: "/icp", label: "ICP" },
  { href: "/security", label: "Security" },
];

export function Nav() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          LeadLoop
        </Link>
        <nav className="flex gap-4 text-sm text-muted">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-foreground transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

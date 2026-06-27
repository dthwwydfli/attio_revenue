"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/console", label: "Console" },
  { href: "/demo/submit", label: "Submit Lead" },
  { href: "/icp", label: "ICP" },
  { href: "/security", label: "Security" },
];

/** Routes that use the workspace sidebar — top nav links are redundant here. */
const SIDEBAR_LAYOUT_PREFIXES = ["/console"];

interface NavProps {
  variant?: "landing" | "app";
}

export function Nav({ variant = "app" }: NavProps) {
  const pathname = usePathname();
  const hideLinks = SIDEBAR_LAYOUT_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/5 backdrop-blur-xl",
        variant === "landing" ? "bg-background/70" : "bg-card/50",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight transition-colors hover:text-accent"
        >
          LeadLoop
        </Link>
        {!hideLinks && (
          <nav className="flex items-center gap-1 text-sm md:gap-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-1.5 text-muted transition-colors hover:bg-white/5 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

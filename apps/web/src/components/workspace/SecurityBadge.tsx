import { Shield } from "lucide-react";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { cn } from "@/lib/utils";

interface SecurityBadgeProps {
  variant?: "compact" | "full";
}

export function SecurityBadge({ variant = "compact" }: SecurityBadgeProps) {
  if (variant === "compact") {
    return (
      <Link
        href="/security"
        className={cn(
          "inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/5 px-2.5 py-1.5 text-xs text-muted transition-colors duration-200",
          "hover:border-white/10 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        <Shield className="h-3.5 w-3.5 text-accent" aria-hidden />
        Aikido CI
      </Link>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-6 md:p-8">
      <div className="mb-4 flex items-center gap-2">
        <Shield className="h-5 w-5 text-accent" aria-hidden />
        <h2 className="text-base font-semibold">Security</h2>
        <span className="ml-auto rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium text-accent">
          Aikido CI
        </span>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-muted">
        Dependency scanning, secrets detection, and SCA on every pull request.
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/security"
          className="inline-flex items-center gap-1 text-sm text-accent transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          View security details
          <ArrowIcon className="h-4 w-4" />
        </Link>
        <a
          href="https://www.aikido.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-muted transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Aikido dashboard
        </a>
      </div>
    </div>
  );
}

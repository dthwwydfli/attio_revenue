import { ArrowIcon } from "@/components/ui/ArrowIcon";
import { cn } from "@/lib/utils";

interface AttioRecordLinkProps {
  url?: string;
  label?: string;
  variant?: "button" | "link";
}

export function AttioRecordLink({
  url,
  label,
  variant = "button",
}: AttioRecordLinkProps) {
  if (!url) return null;

  const text = label ?? "Open in Attio";

  if (variant === "link") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-accent transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {text}
        <ArrowIcon className="h-3.5 w-3.5" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-accent/90",
      )}
    >
      {text}
      <ArrowIcon className="h-4 w-4" />
    </a>
  );
}

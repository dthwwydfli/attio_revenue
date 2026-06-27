"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusBannerVariant = "error" | "warning" | "info" | "success";

interface StatusBannerProps {
  variant?: StatusBannerVariant;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  live?: "polite" | "assertive" | "off";
}

const VARIANT_STYLES: Record<StatusBannerVariant, string> = {
  error: "border-red-500/30 bg-red-500/10 text-red-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  info: "border-blue-400/30 bg-blue-400/10 text-blue-300",
  success: "border-accent/30 bg-accent/10 text-accent",
};

export function StatusBanner({
  variant = "info",
  children,
  onDismiss,
  className,
  live = "polite",
}: StatusBannerProps) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={live}
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        VARIANT_STYLES[variant],
        className,
      )}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 cursor-pointer rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-foreground/90 backdrop-blur-sm transition-all duration-200 hover:border-white/20 hover:bg-white/10",
        className,
      )}
    >
      {children}
    </span>
  );
}

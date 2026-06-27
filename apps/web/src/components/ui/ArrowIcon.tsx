import { cn } from "@/lib/utils";

interface ArrowIconProps {
  className?: string;
}

export function ArrowIcon({ className }: ArrowIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-4 w-4 shrink-0", className)}
      aria-hidden
    >
      <path
        d="M6 18L18 6M18 6H10M18 6V14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

import { cn } from "@/lib/utils";

interface WorkspacePageContentProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "md" | "lg" | "xl";
}

const MAX_WIDTH = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

export function WorkspacePageContent({
  children,
  className,
  maxWidth = "lg",
}: WorkspacePageContentProps) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-6 py-8 md:px-10 md:py-10 lg:px-12 lg:py-12",
        MAX_WIDTH[maxWidth],
        className,
      )}
    >
      {children}
    </main>
  );
}

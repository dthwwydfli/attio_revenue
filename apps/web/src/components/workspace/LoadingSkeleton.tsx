import { cn } from "@/lib/utils";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/5", className)}
      aria-hidden
    />
  );
}

export function LeadPanelSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-10" role="status" aria-label="Loading lead data">
      <div className="space-y-4 border-b border-white/5 pb-10">
        <Bone className="h-9 w-56" />
        <Bone className="h-4 w-44" />
        <Bone className="h-4 w-80" />
      </div>
      <Bone className="h-10 w-full max-w-sm rounded-xl" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bone key={i} className="h-10 w-28 rounded-lg" />
        ))}
      </div>
      <Bone className="h-44 w-full rounded-xl" />
      <Bone className="h-36 w-full rounded-xl" />
      <Bone className="h-28 w-full rounded-xl" />
      <span className="sr-only">Loading lead details…</span>
    </div>
  );
}

export function RightPanelSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading enrichment data">
      {Array.from({ length: 4 }).map((_, i) => (
        <Bone key={i} className="h-28 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading enrichment details…</span>
    </div>
  );
}

export function QueueItemSkeleton() {
  return <Bone className="h-16 w-full rounded-lg" />;
}

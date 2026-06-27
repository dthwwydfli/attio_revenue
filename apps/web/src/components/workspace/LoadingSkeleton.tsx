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
    <div className="mx-auto max-w-6xl space-y-8" role="status" aria-label="Loading lead data">
      <div className="space-y-3 border-b border-white/5 pb-8">
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-40" />
        <Bone className="h-4 w-72" />
      </div>
      <Bone className="h-10 w-full max-w-md rounded-xl" />
      <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="space-y-8">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Bone key={i} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
          <Bone className="h-40 w-full rounded-xl" />
          <Bone className="h-32 w-full rounded-xl" />
        </div>
        <div className="space-y-5">
          <Bone className="h-36 w-full rounded-xl" />
          <Bone className="h-28 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading lead details…</span>
    </div>
  );
}

export function RightPanelSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading enrichment data">
      {Array.from({ length: 3 }).map((_, i) => (
        <Bone key={i} className="h-28 w-full rounded-xl" />
      ))}
      <span className="sr-only">Loading enrichment details…</span>
    </div>
  );
}

export function QueueItemSkeleton() {
  return <Bone className="h-16 w-full rounded-lg" />;
}

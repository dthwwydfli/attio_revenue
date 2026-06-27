"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconMenu2, IconX } from "@tabler/icons-react";
import {
  IconLayoutDashboard,
  IconSend,
  IconShield,
  IconTarget,
} from "@tabler/icons-react";
import type { LeadRun, DemoScenario, LeadBand } from "@leadloop/shared";
import { cn } from "@/lib/utils";
import { LeadQueueList } from "./LeadQueueList";
import { DemoControls } from "./DemoControls";

const NAV_LINKS = [
  { href: "/console", label: "Console", icon: IconLayoutDashboard },
  { href: "/demo/submit", label: "Submit Lead", icon: IconSend },
  { href: "/icp", label: "ICP", icon: IconTarget },
  { href: "/security", label: "Security", icon: IconShield },
] as const;

type BandFilter = LeadBand | "all";

interface WorkspaceSidebarProps {
  queue: LeadRun[];
  selectedId: string;
  bandFilter: BandFilter;
  isReplaying: boolean;
  replayError?: string | null;
  onSelect: (id: string) => void;
  onFilterChange: (filter: BandFilter) => void;
  onReplay: (scenario: DemoScenario) => void;
}

function SidebarInner({
  queue,
  selectedId,
  bandFilter,
  isReplaying,
  replayError,
  onSelect,
  onFilterChange,
  onReplay,
  onNavigate,
}: WorkspaceSidebarProps & { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      <nav className="flex flex-col gap-0.5" aria-label="Primary">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[40px] items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors duration-200",
                active
                  ? "bg-accent/10 text-accent"
                  : "text-muted hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
        <LeadQueueList
          queue={queue}
          selectedId={selectedId}
          bandFilter={bandFilter}
          isReplaying={isReplaying}
          onSelect={(id) => {
            onSelect(id);
            onNavigate?.();
          }}
          onFilterChange={onFilterChange}
        />
      </div>

      <DemoControls onReplay={onReplay} isReplaying={isReplaying} error={replayError} />
    </>
  );
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <div className="flex h-12 shrink-0 items-center justify-end border-b border-white/5 bg-surface-elevated/60 px-4 md:hidden">
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="cursor-pointer rounded-lg p-2 text-foreground transition-colors hover:bg-white/5"
        >
          {mobileOpen ? (
            <IconX className="h-5 w-5" aria-hidden />
          ) : (
            <IconMenu2 className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background p-6 pt-16 md:hidden">
          <SidebarInner {...props} onNavigate={() => setMobileOpen(false)} />
        </div>
      )}

      <aside
        className="hidden h-full w-[252px] shrink-0 flex-col border-r border-white/5 bg-surface-elevated/60 backdrop-blur-xl md:flex"
        aria-label="Workspace navigation"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5">
          <SidebarInner {...props} />
        </div>
      </aside>
    </>
  );
}

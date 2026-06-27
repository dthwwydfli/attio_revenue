"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import {
  IconLayoutDashboard,
  IconSend,
  IconShield,
  IconTarget,
} from "@tabler/icons-react";
import type { LeadRun, DemoScenario, LeadBand } from "@leadloop/shared";
import { Sidebar, SidebarBody, SidebarLink, useSidebar } from "@/components/ui/sidebar";
import { LeadQueueList } from "./LeadQueueList";
import { DemoControls } from "./DemoControls";

const NAV_LINKS = [
  {
    href: "/console",
    label: "Console",
    icon: IconLayoutDashboard,
  },
  {
    href: "/demo/submit",
    label: "Submit Lead",
    icon: IconSend,
  },
  {
    href: "/icp",
    label: "ICP",
    icon: IconTarget,
  },
  {
    href: "/security",
    label: "Security",
    icon: IconShield,
  },
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

function SidebarLogo() {
  return (
    <Link
      href="/console"
      className="relative z-20 flex items-center gap-2 py-1 text-sm font-normal"
    >
      <div className="h-5 w-5 shrink-0 rounded-md bg-accent" aria-hidden />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display whitespace-pre font-semibold text-foreground"
      >
        LeadLoop
      </motion.span>
    </Link>
  );
}

function SidebarLogoIcon() {
  return (
    <Link
      href="/console"
      className="relative z-20 flex items-center py-1"
      aria-label="LeadLoop"
    >
      <div className="h-5 w-5 shrink-0 rounded-md bg-accent" aria-hidden />
    </Link>
  );
}

function SidebarContent({
  queue,
  selectedId,
  bandFilter,
  isReplaying,
  replayError,
  onSelect,
  onFilterChange,
  onReplay,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const { open } = useSidebar();

  const links = NAV_LINKS.map(({ href, label, icon: Icon }) => ({
    href,
    label,
    icon: (
      <Icon
        className="h-5 w-5 shrink-0 text-current"
        aria-hidden
      />
    ),
  }));

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {open ? <SidebarLogo /> : <SidebarLogoIcon />}

        <nav className="mt-6 flex flex-col gap-0.5" aria-label="Workspace navigation">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <SidebarLink key={link.href} link={link} active={active} />
            );
          })}
        </nav>

        {open && (
          <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-hidden">
            <LeadQueueList
              queue={queue}
              selectedId={selectedId}
              bandFilter={bandFilter}
              isReplaying={isReplaying}
              onSelect={onSelect}
              onFilterChange={onFilterChange}
            />
          </div>
        )}
      </div>

      {open && (
        <DemoControls
          onReplay={onReplay}
          isReplaying={isReplaying}
          error={replayError}
        />
      )}
    </>
  );
}

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-6 overflow-hidden">
        <SidebarContent {...props} />
      </SidebarBody>
    </Sidebar>
  );
}

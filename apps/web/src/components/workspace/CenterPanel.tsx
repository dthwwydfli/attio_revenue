"use client";

import { useState, useEffect } from "react";
import type { LeadRun } from "@leadloop/shared";
import { ActiveLeadPanel } from "./ActiveLeadPanel";
import { WorkspaceStepper } from "./WorkspaceStepper";
import { MainStatusCard } from "./MainStatusCard";
import { EmailDraftCard } from "./EmailDraftCard";
import { SupportingEvidence } from "./SupportingEvidence";
import { CompactSyncStatus } from "./CompactSyncStatus";
import { WorkspaceTabs, type WorkspaceTab } from "./WorkspaceTabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { SecurityBadge } from "./SecurityBadge";
import { LeadPanelSkeleton } from "./LoadingSkeleton";

interface CenterPanelProps {
  run: LeadRun;
  isLoading: boolean;
}

export function CenterPanel({ run, isLoading }: CenterPanelProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [run.id]);

  if (isLoading && !run.score) {
    return <LeadPanelSkeleton />;
  }

  return (
    <div
      key={run.id}
      className="mx-auto max-w-6xl motion-safe:transition-opacity motion-safe:duration-200 motion-safe:opacity-100"
    >
      <ActiveLeadPanel run={run} />

      <div className="mt-8">
        <WorkspaceTabs
          active={activeTab}
          onChange={setActiveTab}
          activityCount={run.events.length}
        />
      </div>

      {activeTab === "overview" && (
        <div
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          className="mt-10"
        >
          <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:gap-12 xl:grid-cols-[1fr_360px]">
            <section className="space-y-8" aria-label="Lead workflow">
              <WorkspaceStepper run={run} />
              <MainStatusCard run={run} />
              <EmailDraftCard action={run.action} band={run.score?.band} />
              <CompactSyncStatus attio={run.attio} slng={run.slng} />
            </section>

            <SupportingEvidence run={run} />
          </div>
        </div>
      )}

      {activeTab === "activity" && (
        <div
          id="panel-activity"
          role="tabpanel"
          aria-labelledby="tab-activity"
          className="mt-10"
        >
          <ActivityTimeline events={run.events} />
        </div>
      )}

      {activeTab === "security" && (
        <div
          id="panel-security"
          role="tabpanel"
          aria-labelledby="tab-security"
          className="mt-10 max-w-xl"
        >
          <SecurityBadge variant="full" />
        </div>
      )}
    </div>
  );
}

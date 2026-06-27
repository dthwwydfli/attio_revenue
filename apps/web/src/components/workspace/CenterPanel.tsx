"use client";

import { useState, useEffect } from "react";
import type { LeadRun } from "@leadloop/shared";
import { ActiveLeadPanel } from "./ActiveLeadPanel";
import { WorkspaceStepper } from "./WorkspaceStepper";
import { MainStatusCard } from "./MainStatusCard";
import { EmailDraftCard } from "./EmailDraftCard";
import { ActionCard } from "./ActionCard";
import { InspectorPanel } from "./InspectorPanel";
import { WorkspaceTabs, type WorkspaceTab } from "./WorkspaceTabs";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { SecurityBadge } from "./SecurityBadge";
import { LeadPanelSkeleton } from "./LoadingSkeleton";

interface CenterPanelProps {
  run: LeadRun;
  isLoading: boolean;
  isApproving?: boolean;
  approveError?: string | null;
  onApprove?: () => void;
}

export function CenterPanel({ run, isLoading, isApproving, approveError, onApprove }: CenterPanelProps) {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");

  useEffect(() => {
    setActiveTab("overview");
  }, [run.id]);

  if (isLoading && !run.score) {
    return <LeadPanelSkeleton />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
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
          className="mt-8"
        >
          <div className="space-y-8">
            <WorkspaceStepper run={run} />
            <MainStatusCard run={run} />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start xl:gap-10">
            <EmailDraftCard action={run.action} band={run.score?.band} />
            <div className="lg:sticky lg:top-8">
              <ActionCard
                run={run}
                isApproving={isApproving}
                approveError={approveError}
                onApprove={onApprove}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "details" && (
        <div
          id="panel-details"
          role="tabpanel"
          aria-labelledby="tab-details"
          className="mx-auto mt-12 max-w-2xl"
        >
          <InspectorPanel run={run} isLoading={isLoading} />
        </div>
      )}

      {activeTab === "activity" && (
        <div
          id="panel-activity"
          role="tabpanel"
          aria-labelledby="tab-activity"
          className="mx-auto mt-12 max-w-3xl"
        >
          <ActivityTimeline events={run.events} />
        </div>
      )}

      {activeTab === "security" && (
        <div
          id="panel-security"
          role="tabpanel"
          aria-labelledby="tab-security"
          className="mx-auto mt-12 max-w-xl"
        >
          <SecurityBadge variant="full" />
        </div>
      )}
    </div>
  );
}

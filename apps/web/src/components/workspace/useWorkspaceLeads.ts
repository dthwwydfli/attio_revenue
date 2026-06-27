"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DemoScenario, LeadBand, LeadRun, LeadStatusResponse } from "@leadloop/shared";
import { apiFetch } from "@/lib/api-client";
import {
  INITIAL_QUEUE,
  WORKSPACE_FIXTURES,
  scenarioFromRun,
} from "@/lib/workspace-fixtures";

export type BandFilter = LeadBand | "all";

export type QueueItem = {
  id: string;
  scenario?: DemoScenario;
  run: LeadRun;
  isLive?: boolean;
};

const PIPELINE_STEPS: LeadRun["currentStep"][] = [
  "received",
  "attio_upsert",
  "enriched",
  "scored",
  "action_generated",
  "voice",
  "attio_writeback",
  "completed",
];

function simulateReplay(scenario: DemoScenario, onTick: (run: LeadRun) => void): () => void {
  const base = structuredClone(WORKSPACE_FIXTURES[scenario]);
  const id = `replay-${scenario}-${Date.now()}`;
  base.id = id;
  base.status = "processing";
  base.currentStep = "received";
  base.events = [];
  base.enrichment = undefined;
  base.score = undefined;
  base.action = undefined;
  base.slng = undefined;
  base.attio = undefined;
  base.createdAt = new Date().toISOString();
  base.updatedAt = new Date().toISOString();

  let stepIdx = 0;
  onTick({ ...base });

  const interval = setInterval(() => {
    if (stepIdx >= PIPELINE_STEPS.length) {
      clearInterval(interval);
      const final = structuredClone(WORKSPACE_FIXTURES[scenario]);
      final.id = id;
      final.createdAt = base.createdAt;
      onTick(final);
      return;
    }

    const step = PIPELINE_STEPS[stepIdx];
    base.currentStep = step;
    base.events.push({
      step,
      status: "completed",
      message: step === "scored" ? `${WORKSPACE_FIXTURES[scenario].score?.band} via mock` : step,
      timestamp: new Date().toISOString(),
      durationMs: 180 + stepIdx * 40,
    });

    if (step === "enriched") base.enrichment = WORKSPACE_FIXTURES[scenario].enrichment;
    if (step === "scored") base.score = WORKSPACE_FIXTURES[scenario].score;
    if (step === "action_generated") base.action = WORKSPACE_FIXTURES[scenario].action;
    if (step === "voice") base.slng = WORKSPACE_FIXTURES[scenario].slng;
    if (step === "attio_writeback") base.attio = WORKSPACE_FIXTURES[scenario].attio;
    if (step === "completed") {
      base.status = "completed";
      base.enrichment = WORKSPACE_FIXTURES[scenario].enrichment;
      base.score = WORKSPACE_FIXTURES[scenario].score;
      base.action = WORKSPACE_FIXTURES[scenario].action;
      base.slng = WORKSPACE_FIXTURES[scenario].slng;
      base.attio = WORKSPACE_FIXTURES[scenario].attio;
    }

    base.updatedAt = new Date().toISOString();
    onTick({ ...base });
    stepIdx++;
  }, 450);

  return () => clearInterval(interval);
}

export function useWorkspaceLeads(initialLeadId?: string | null) {
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    INITIAL_QUEUE.map((run) => ({
      id: run.id,
      scenario: scenarioFromRun(run),
      run,
    })),
  );
  const [selectedId, setSelectedId] = useState(initialLeadId ?? "demo-hot");
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);

  const selected = useMemo(
    () => queue.find((q) => q.id === selectedId) ?? queue[0],
    [queue, selectedId],
  );

  const filteredQueue = useMemo(() => {
    if (bandFilter === "all") return queue;
    return queue.filter((q) => q.run.score?.band === bandFilter);
  }, [queue, bandFilter]);

  const updateQueueItem = useCallback((id: string, run: LeadRun, isLive?: boolean) => {
    setQueue((prev) => {
      const exists = prev.find((q) => q.id === id);
      const item: QueueItem = {
        id,
        scenario: scenarioFromRun(run),
        run,
        isLive,
      };
      if (exists) return prev.map((q) => (q.id === id ? item : q));
      return [item, ...prev];
    });
  }, []);

  const pollLead = useCallback(
    async (leadId: string) => {
      setIsLoading(true);
      let active = true;

      const poll = async (): Promise<boolean> => {
        try {
          const status = await apiFetch<LeadStatusResponse>(`/leads/${leadId}/status`);
          if (!active) return false;

          updateQueueItem(leadId, {
            id: leadId,
            status: status.status,
            currentStep: status.currentStep,
            input: queue.find((q) => q.id === leadId)?.run.input ?? WORKSPACE_FIXTURES.hot.input,
            events: status.events,
            score: status.score,
            slng: status.slng,
            attio: status.attio,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }, true);

          if (status.status === "completed" || status.status === "failed") {
            const detail = await apiFetch<LeadRun>(`/leads/${leadId}`);
            if (active) updateQueueItem(leadId, detail, false);
            return false;
          }
          return true;
        } catch {
          return false;
        }
      };

      let cont = await poll();
      if (!cont) {
        if (active) setIsLoading(false);
        return;
      }

      const interval = setInterval(async () => {
        cont = await poll();
        if (!cont) {
          clearInterval(interval);
          if (active) setIsLoading(false);
        }
      }, 800);

      return () => {
        active = false;
        clearInterval(interval);
      };
    },
    [queue, updateQueueItem],
  );

  useEffect(() => {
    if (initialLeadId && initialLeadId !== "demo-hot" && initialLeadId !== "demo-warm" && initialLeadId !== "demo-cold") {
      setSelectedId(initialLeadId);
      void pollLead(initialLeadId);
    }
  }, [initialLeadId, pollLead]);

  const selectLead = useCallback((id: string) => {
    setSelectedId(id);
    setIsLoading(false);
  }, []);

  const replayScenario = useCallback(
    async (scenario: DemoScenario) => {
      setIsReplaying(true);
      setReplayError(null);

      try {
        const res = await fetch(`/api/replay/${scenario}`, { method: "POST", redirect: "manual" });
        const location = res.headers.get("Location") ?? "";
        const match = location.match(/leadId=([^&]+)/);
        const leadId = match?.[1];

        if (leadId) {
          setSelectedId(leadId);
          await pollLead(leadId);
          setIsReplaying(false);
          return;
        }
      } catch {
        // fall through to client simulation
      }

      const id = `replay-${scenario}-${Date.now()}`;
      setSelectedId(id);
      setIsLoading(true);

      const cleanup = simulateReplay(scenario, (run) => {
        updateQueueItem(id, run, run.status !== "completed");
        if (run.status === "completed") {
          setIsLoading(false);
          setIsReplaying(false);
        }
      });

      return cleanup;
    },
    [pollLead, updateQueueItem],
  );

  return {
    queue: filteredQueue,
    selected,
    selectedId,
    bandFilter,
    isLoading,
    isReplaying,
    replayError,
    setBandFilter,
    selectLead,
    replayScenario,
    setReplayError,
  };
}

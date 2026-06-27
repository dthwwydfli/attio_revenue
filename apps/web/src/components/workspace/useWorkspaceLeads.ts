"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ApproveLeadResponse, DemoScenario, LeadBand, LeadRun, LeadStatusResponse } from "@leadloop/shared";
import { apiFetch } from "@/lib/api-client";
import { isInFlight } from "@/lib/workspace-utils";
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

const DEMO_IDS = new Set(["demo-hot", "demo-warm", "demo-cold"]);

function isDemoId(id: string): boolean {
  return DEMO_IDS.has(id);
}

export function useWorkspaceLeads(initialLeadId?: string | null) {
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialLeadId ?? null);
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  const queueRef = useRef(queue);
  queueRef.current = queue;

  const pollingLeadRef = useRef<string | null>(null);
  const pollCleanupRef = useRef<(() => void) | null>(null);

  const selected = useMemo(
    () => (selectedId ? queue.find((q) => q.id === selectedId) : undefined) ?? queue[0],
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
    async (leadId: string, inputFallback?: LeadRun["input"]) => {
      pollCleanupRef.current?.();
      setIsLoading(true);
      setPollError(null);
      let active = true;
      let consecutiveErrors = 0;

      const poll = async (): Promise<boolean> => {
        try {
          const status = await apiFetch<LeadStatusResponse>(`/leads/${leadId}/status`);
          if (!active) return false;
          consecutiveErrors = 0;
          setPollError(null);

          updateQueueItem(
            leadId,
            {
              id: leadId,
              status: status.status,
              currentStep: status.currentStep,
              input:
                inputFallback ??
                queueRef.current.find((q) => q.id === leadId)?.run.input ??
                WORKSPACE_FIXTURES.hot.input,
              events: status.events,
              score: status.score,
              slng: status.slng,
              attio: status.attio,
              humanApproved: status.humanApproved,
              approvedAt: status.approvedAt,
              error: status.error,
              createdAt:
                queueRef.current.find((q) => q.id === leadId)?.run.createdAt ??
                new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            true,
          );

          if (status.status === "completed" || status.status === "failed") {
            const detail = await apiFetch<LeadRun>(`/leads/${leadId}`);
            if (active) updateQueueItem(leadId, detail, false);
            return false;
          }
          return true;
        } catch {
          consecutiveErrors += 1;
          if (consecutiveErrors >= 3 && active) {
            setPollError("Lost connection to API — polling stopped.");
          }
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

      const cleanup = () => {
        active = false;
        clearInterval(interval);
      };
      pollCleanupRef.current = cleanup;
      return cleanup;
    },
    [updateQueueItem],
  );

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        await apiFetch("/health");
        if (!active) return;
        setApiOnline(true);

        const runs = await apiFetch<LeadRun[]>("/leads");
        if (!active) return;

        if (runs.length > 0) {
          setQueue(
            runs.map((run) => ({
              id: run.id,
              scenario: scenarioFromRun(run),
              run,
              isLive: !run.attio?.personUrl?.includes("/demo/"),
            })),
          );
          if (!initialLeadId) {
            setSelectedId(runs[0]?.id ?? null);
          }
        } else if (!initialLeadId) {
          setSelectedId(null);
        }
      } catch {
        if (!active) return;
        setApiOnline(false);
        setQueue(
          INITIAL_QUEUE.map((run) => ({
            id: run.id,
            scenario: scenarioFromRun(run),
            run,
            isLive: false,
          })),
        );
        if (!initialLeadId) {
          setSelectedId("demo-hot");
        }
      }
    }

    void hydrate();
    return () => {
      active = false;
    };
  }, [initialLeadId]);

  useEffect(() => {
    if (!initialLeadId || isDemoId(initialLeadId)) return;
    if (pollingLeadRef.current === initialLeadId) return;

    pollingLeadRef.current = initialLeadId;
    setSelectedId((current) => (current !== initialLeadId ? initialLeadId : current));
    void pollLead(initialLeadId);
  }, [initialLeadId, pollLead]);

  useEffect(() => {
    return () => {
      pollCleanupRef.current?.();
    };
  }, []);

  const selectLead = useCallback(
    (id: string) => {
      setSelectedId(id);
      setApproveError(null);
      setPollError(null);

      router.replace(`/console?leadId=${id}`, { scroll: false });

      const item = queueRef.current.find((q) => q.id === id);
      if (item && isInFlight(item.run) && apiOnline !== false) {
        pollingLeadRef.current = id;
        void pollLead(id, item.run.input);
      } else {
        setIsLoading(false);
      }
    },
    [apiOnline, pollLead, router],
  );

  const replayScenario = useCallback(
    async (scenario: DemoScenario) => {
      setIsReplaying(true);
      setReplayError(null);

      try {
        const res = await fetch(`/api/replay/${scenario}`, { method: "POST" });
        const data = (await res.json()) as { leadRunId?: string; error?: string };

        if (!res.ok || !data.leadRunId) {
          setReplayError(data.error ?? "Replay failed — is the API running?");
          setIsReplaying(false);
          return;
        }

        const input = WORKSPACE_FIXTURES[scenario].input;
        updateQueueItem(
          data.leadRunId,
          {
            id: data.leadRunId,
            status: "processing",
            currentStep: "received",
            input,
            events: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          true,
        );
        setSelectedId(data.leadRunId);
        router.replace(`/console?leadId=${data.leadRunId}`, { scroll: false });
        pollingLeadRef.current = data.leadRunId;
        await pollLead(data.leadRunId, input);
        setIsReplaying(false);
      } catch (err) {
        setReplayError(err instanceof Error ? err.message : "Replay failed");
        setIsReplaying(false);
      }
    },
    [pollLead, router, updateQueueItem],
  );

  const approveLead = useCallback(
    async (id: string) => {
      if (apiOnline === false) {
        setApproveError("API offline — start the server with pnpm dev");
        return;
      }

      setIsApproving(true);
      setApproveError(null);

      try {
        const result = await apiFetch<ApproveLeadResponse>(`/leads/${id}/approve`, {
          method: "POST",
        });

        const detail = await apiFetch<LeadRun>(`/leads/${id}`);
        updateQueueItem(id, detail, false);

        if (result.mailtoUrl) {
          window.location.href = result.mailtoUrl;
        }
      } catch (err) {
        setApproveError(err instanceof Error ? err.message : "Approval failed");
      } finally {
        setIsApproving(false);
      }
    },
    [apiOnline, updateQueueItem],
  );

  return {
    queue: filteredQueue,
    selected,
    selectedId: selectedId ?? "",
    bandFilter,
    isLoading,
    isReplaying,
    isApproving,
    replayError,
    approveError,
    pollError,
    apiOnline,
    setBandFilter,
    selectLead,
    replayScenario,
    approveLead,
    setReplayError,
    setApproveError,
  };
}

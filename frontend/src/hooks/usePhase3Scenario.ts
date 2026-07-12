import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RawSyntheticEvent } from "../lib/rawSyntheticEvent";
import type { RejectedSyntheticEvent } from "../lib/rawSyntheticEvent";
import type { SyntheticDetection } from "../lib/detectionRules";
import type { DetectionGraph } from "../lib/detectionGraph";
import type { AttackPathPriorityResult } from "../lib/priorityScore";
import type { SyntheticRemediationResult } from "../lib/remediation";
import { rawSyntheticEventFixtures } from "../data/rawSyntheticEventFixtures";

export type SyntheticAuditEntry = {
  id: string;
  synthetic: true;
  timestamp: string;
  type: string;
  title: string;
  description: string;
  relatedEventIds: string[];
  relatedDetectionIds: string[];
  relatedEntityIds: string[];
};

export type SyntheticSessionState = {
  events: RawSyntheticEvent[];
  rejected: RejectedSyntheticEvent[];
  detections: SyntheticDetection[];
  graph: DetectionGraph | null;
  priority: AttackPathPriorityResult | null;
  remediation: {
    applied: boolean;
    actionId?: string;
    result?: SyntheticRemediationResult;
  };
  auditEntries: SyntheticAuditEntry[];
};

const SESSION_KEY = "aegispath.phase3.synthetic-session.v1";

const DEFAULT_STATE: SyntheticSessionState = {
  events: [],
  rejected: [],
  detections: [],
  graph: null,
  priority: null,
  remediation: { applied: false },
  auditEntries: []
};

function getSessionState(): SyntheticSessionState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const item = window.sessionStorage.getItem(SESSION_KEY);
    return item ? JSON.parse(item) : DEFAULT_STATE;
  } catch (e) {
    console.warn("Failed to parse Phase 3 sessionStorage. Resetting to default.");
    return DEFAULT_STATE;
  }
}

function setSessionState(state: SyntheticSessionState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save Phase 3 sessionStorage", e);
  }
}

export function usePhase3Scenario() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  const [localState, setLocalState] = useState<SyntheticSessionState>(DEFAULT_STATE);

  useEffect(() => {
    setIsClient(true);
    setLocalState(getSessionState());
  }, []);

  const updateState = useCallback((updater: (prev: SyntheticSessionState) => SyntheticSessionState) => {
    setLocalState((prev) => {
      const next = updater(prev);
      setSessionState(next);
      queryClient.setQueryData(["phase3State"], next);
      return next;
    });
  }, [queryClient]);

  const addAudit = useCallback((entry: Omit<SyntheticAuditEntry, "id" | "synthetic" | "timestamp">) => {
    const fullEntry: SyntheticAuditEntry = {
      id: `p3_audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      synthetic: true,
      timestamp: new Date().toISOString(),
      ...entry
    };
    updateState((prev) => ({
      ...prev,
      auditEntries: [fullEntry, ...prev.auditEntries]
    }));
  }, [updateState]);

  const ingestMutation = useMutation({
    mutationFn: async (events: unknown[]) => {
      const res = await fetch("/api/scenario/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events })
      });
      if (!res.ok) {
        let msg = res.statusText;
        try {
          const json = await res.json();
          msg = json.error || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: (data: any, reqEvents: unknown[]) => {
      updateState((prev) => {
        const nextEvents = reqEvents as RawSyntheticEvent[]; // We store the request valid set conceptually. Actually we should just store the accumulated array.
        return {
          ...prev,
          events: nextEvents, // For Phase 3, we simply replace the event store with the new batch
          rejected: data.rejected,
          detections: data.detections,
          graph: data.graph,
          priority: data.score,
          remediation: { applied: false }
        };
      });

      addAudit({
        type: "ingestion",
        title: "Synthetic Events Processed",
        description: `Processed ${reqEvents.length} events. ${data.acceptedEventCount} accepted, ${data.rejectedEventCount} rejected. Generated ${data.detectionCount} detections.`,
        relatedEventIds: [],
        relatedDetectionIds: data.detections.map((d: any) => d.id),
        relatedEntityIds: []
      });
    }
  });

  const remediateMutation = useMutation({
    mutationFn: async ({ events, actionId }: { events: RawSyntheticEvent[], actionId: string }) => {
      const res = await fetch("/api/scenario/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events, actionId })
      });
      if (!res.ok) {
        let msg = res.statusText;
        try {
          const json = await res.json();
          msg = json.error || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: (data: any, req) => {
      updateState((prev) => ({
        ...prev,
        remediation: {
          applied: true,
          actionId: req.actionId,
          result: data.result
        }
      }));

      addAudit({
        type: "remediation",
        title: "Synthetic Remediation Applied",
        description: `Action ${req.actionId} applied. Mitigated ${data.result.mitigatedDetectionIds.length} detections.`,
        relatedEventIds: [],
        relatedDetectionIds: data.result.mitigatedDetectionIds,
        relatedEntityIds: []
      });
    }
  });

  const processNextEvent = useCallback(() => {
    const currentCount = localState.events.length;
    if (currentCount >= rawSyntheticEventFixtures.length) return;
    const nextBatch = rawSyntheticEventFixtures.slice(0, currentCount + 1);
    ingestMutation.mutate(nextBatch);
  }, [localState.events.length, ingestMutation]);

  const loadAllFixtures = useCallback(() => {
    ingestMutation.mutate(rawSyntheticEventFixtures);
  }, [ingestMutation]);

  const resetPhase3 = useCallback(() => {
    setLocalState(DEFAULT_STATE);
    setSessionState(DEFAULT_STATE);
    queryClient.setQueryData(["phase3State"], DEFAULT_STATE);
    addAudit({
      type: "reset",
      title: "Phase 3 Session Reset",
      description: "Cleared all synthetic events, detections, and graph state.",
      relatedEventIds: [],
      relatedDetectionIds: [],
      relatedEntityIds: []
    });
  }, [addAudit, queryClient]);

  const resetRemediation = useCallback(() => {
    // Re-evaluate the existing events
    ingestMutation.mutate(localState.events);
    addAudit({
      type: "reset",
      title: "Synthetic Remediation Reset",
      description: "Restored original detection graph and priority score.",
      relatedEventIds: [],
      relatedDetectionIds: [],
      relatedEntityIds: []
    });
  }, [localState.events, ingestMutation, addAudit]);

  const applyRemediation = useCallback((actionId: string) => {
    remediateMutation.mutate({ events: localState.events, actionId });
  }, [localState.events, remediateMutation]);

  return {
    state: localState,
    isClient,
    isPending: ingestMutation.isPending || remediateMutation.isPending,
    error: ingestMutation.error || remediateMutation.error,
    processNextEvent,
    loadAllFixtures,
    resetPhase3,
    resetRemediation,
    applyRemediation,
    canProcessNext: localState.events.length < rawSyntheticEventFixtures.length
  };
}

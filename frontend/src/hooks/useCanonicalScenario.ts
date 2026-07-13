import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CanonicalAnalysisResult } from "../lib/canonicalEngine";
import type { RawSyntheticEvent } from "../lib/rawSyntheticEvent";
import { rawSyntheticEventFixtures } from "../data/rawSyntheticEventFixtures";

// We store only the absolute minimum required to reproduce the scenario on the backend.
// This prevents mixing stale frontend state with backend logic.
type CanonicalSessionInput = {
  processedEventCount: number;
  remediationActionId: "remediation:patch-wst-02" | "patch_wst_02" | null;
  auditSessionEvents: any[]; // UI-only audit trails like "User clicked start"
};

const SESSION_KEY = "aegispath.canonical-analysis.v1";

const DEFAULT_INPUT: CanonicalSessionInput = {
  processedEventCount: 0,
  remediationActionId: null,
  auditSessionEvents: []
};

function getPersistedInput(): CanonicalSessionInput {
  if (typeof window === "undefined") return DEFAULT_INPUT;
  try {
    const item = window.sessionStorage.getItem(SESSION_KEY);
    return item ? JSON.parse(item) : DEFAULT_INPUT;
  } catch (e) {
    return DEFAULT_INPUT;
  }
}

function persistInput(input: CanonicalSessionInput) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(input));
  } catch (e) {
    console.warn("Failed to save canonical session", e);
  }
}

export function useCanonicalScenario() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);
  const [sessionInput, setSessionInput] = useState<CanonicalSessionInput>(DEFAULT_INPUT);

  useEffect(() => {
    setIsClient(true);
    setSessionInput(getPersistedInput());
  }, []);

  const updateSession = useCallback((updater: (prev: CanonicalSessionInput) => CanonicalSessionInput) => {
    setSessionInput((prev) => {
      const next = updater(prev);
      persistInput(next);
      return next;
    });
  }, []);

  // Determine the events to send based on the current count
  const eventsToSend = useMemo(() => {
    return rawSyntheticEventFixtures.slice(0, sessionInput.processedEventCount);
  }, [sessionInput.processedEventCount]);

  // The primary query that derives ALL application state from the backend
  const {
    data: canonicalResult,
    isPending,
    isError,
    error,
    isFetching
  } = useQuery({
    queryKey: ["canonicalAnalysis", sessionInput.processedEventCount, sessionInput.remediationActionId],
    queryFn: async () => {
      const res = await fetch("/api/scenario/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: eventsToSend,
          remediationActionId: sessionInput.remediationActionId
        })
      });
      if (!res.ok) {
        let msg = res.statusText;
        try {
          const json = await res.json();
          msg = json.error || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      return (await res.json()) as CanonicalAnalysisResult;
    },
    enabled: isClient, // wait for hydration
  });

  const addUiAuditEntry = useCallback((action: string, detail: string) => {
    updateSession(prev => ({
      ...prev,
      auditSessionEvents: [{
        id: `ui_audit_${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        status: "success",
        detail
      }, ...prev.auditSessionEvents]
    }));
  }, [updateSession]);

  const processNextEvent = useCallback(() => {
    if (sessionInput.processedEventCount >= rawSyntheticEventFixtures.length) return;
    updateSession(prev => ({
      ...prev,
      processedEventCount: prev.processedEventCount + 1
    }));
    addUiAuditEntry("process_next", `Manually processed event ${sessionInput.processedEventCount + 1}`);
  }, [sessionInput.processedEventCount, updateSession, addUiAuditEntry]);

  const processAllEvents = useCallback(() => {
    updateSession(prev => ({
      ...prev,
      processedEventCount: rawSyntheticEventFixtures.length
    }));
    addUiAuditEntry("process_all", "Processed all scenario events instantly.");
  }, [updateSession, addUiAuditEntry]);

  const applyRemediation = useCallback((actionId: string) => {
    updateSession(prev => ({
      ...prev,
      remediationActionId: actionId as any
    }));
    addUiAuditEntry("apply_remediation", `Applied remediation action: ${actionId}`);
  }, [updateSession, addUiAuditEntry]);

  const resetRemediation = useCallback(() => {
    updateSession(prev => ({
      ...prev,
      remediationActionId: null
    }));
    addUiAuditEntry("reset_remediation", "Removed active remediation action.");
  }, [updateSession, addUiAuditEntry]);

  const resetAnalysis = useCallback(() => {
    updateSession(() => DEFAULT_INPUT);
    queryClient.removeQueries({ queryKey: ["canonicalAnalysis"] });
  }, [updateSession, queryClient]);

  return {
    isClient,
    sessionInput,
    canonicalResult,
    isLoading: isPending || isFetching || !isClient,
    isError,
    error,
    processNextEvent,
    processAllEvents,
    applyRemediation,
    resetRemediation,
    resetAnalysis,
    canProcessNext: sessionInput.processedEventCount < rawSyntheticEventFixtures.length
  };
}

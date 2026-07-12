import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ScenarioState,
  AuditEntry,
  RemediationPreview,
  ScenarioResetResponse,
  RemediationApplyResponse,
} from "../lib/types";

// Deterministic audit IDs for replay steps — used for deduplication
const REPLAY_AUDIT_IDS = [
  "audit_replay_started",
  "audit_replay_step_1",
  "audit_replay_step_2",
  "audit_replay_step_3",
  "audit_replay_step_4",
  "audit_replay_restarted",
] as const;

const REPLAY_STEP_AUDIT: Record<number, Omit<AuditEntry, "id" | "timestamp">> = {
  1: {
    user: "Demo Analyst",
    action: "Threat Event Processed",
    resource: "USR_03 → WST_02 (evt_001)",
    ipAddress: "session-local",
    result: "Success",
    dynamic: true,
  },
  2: {
    user: "Demo Analyst",
    action: "Chokepoint Detected",
    resource: "WST_02 → SVC_01 (evt_002) — Remediation Available",
    ipAddress: "session-local",
    result: "Warning",
    dynamic: true,
  },
  3: {
    user: "Demo Analyst",
    action: "Threat Event Processed",
    resource: "SVC_01 → SRV_01 (evt_003) — Lateral Movement",
    ipAddress: "session-local",
    result: "Warning",
    dynamic: true,
  },
  4: {
    user: "Demo Analyst",
    action: "Attack Path Confirmed",
    resource: "SRV_01 → DC_01 (evt_004) — Critical Path Active",
    ipAddress: "session-local",
    result: "Warning",
    dynamic: true,
  },
};

const SESSION_KEYS = {
  APPLIED: "aegispath.remediationApplied",
  TIMESTAMP: "aegispath.remediationTimestamp",
  AUDIT: "aegispath.dynamicAuditEntries",
  REPLAY: "aegispath.replayStep",
};

function getSessionItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = window.sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Failed to parse sessionStorage for ${key}`, e);
    return defaultValue;
  }
}

function setSessionItem<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to set sessionStorage for ${key}`, e);
  }
}

export function useScenarioState() {
  const queryClient = useQueryClient();
  const [isClient, setIsClient] = useState(false);

  // Hydration sync
  const [sessionApplied, setSessionApplied] = useState(false);
  const [sessionTimestamp, setSessionTimestamp] = useState<string | null>(null);
  const [dynamicAuditEntries, setDynamicAuditEntries] = useState<AuditEntry[]>([]);
  const [sessionReplayStep, setSessionReplayStep] = useState<number>(4);

  useEffect(() => {
    setIsClient(true);
    setSessionApplied(getSessionItem<boolean>(SESSION_KEYS.APPLIED, false));
    setSessionTimestamp(getSessionItem<string | null>(SESSION_KEYS.TIMESTAMP, null));
    setDynamicAuditEntries(getSessionItem<AuditEntry[]>(SESSION_KEYS.AUDIT, []));
    setSessionReplayStep(getSessionItem<number>(SESSION_KEYS.REPLAY, 4));
  }, []);

  const addAuditEntry = useCallback((entry: AuditEntry) => {
    setDynamicAuditEntries((prev) => {
      // Prevent duplicates by id
      if (prev.some((e) => e.id === entry.id)) return prev;
      const next = [entry, ...prev]; // Preserve order with newest entry first
      setSessionItem(SESSION_KEYS.AUDIT, next);
      return next;
    });
  }, []);

  const clearReplayAuditEntries = useCallback(() => {
    setDynamicAuditEntries((prev) => {
      const replayIdSet = new Set(REPLAY_AUDIT_IDS as readonly string[]);
      // Clear all replay-generated IDs (start, steps 1-4, restarted) and remediation/reset entries from prior run
      const next = prev.filter((e) => !replayIdSet.has(e.id) && e.id !== "audit_replay_restarted");
      setSessionItem(SESSION_KEYS.AUDIT, next);
      return next;
    });
  }, []);

  const handleApiError = async (res: Response, defaultMessage: string): Promise<never> => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || defaultMessage);
    }
    throw new Error("Scenario API returned a non-JSON response.");
  };

  // Fetch state
  const {
    data: scenarioState,
    isPending,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey: ["scenarioState", sessionApplied, sessionReplayStep],
    queryFn: async () => {
      const res = await fetch(
        `/api/scenario/state?remediated=${sessionApplied}&step=${sessionReplayStep}`,
      );
      if (!res.ok) {
        await handleApiError(res, `Failed to fetch state: ${res.statusText}`);
      }
      return (await res.json()) as ScenarioState;
    },
    enabled: isClient, // Don't fetch until we know the hydrated session state
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/scenario/start", { method: "POST" });
      if (!res.ok) {
        await handleApiError(res, "Failed to start scenario");
      }
      return (await res.json()) as ScenarioState;
    },
    onSuccess: (data) => {
      // Clear all prior dynamic entries (replay steps, remediation, resets) before starting fresh
      setDynamicAuditEntries([]);
      setSessionItem(SESSION_KEYS.AUDIT, []);
      setSessionApplied(false);
      setSessionTimestamp(null);
      setSessionReplayStep(0);
      setSessionItem(SESSION_KEYS.APPLIED, false);
      setSessionItem(SESSION_KEYS.TIMESTAMP, null);
      setSessionItem(SESSION_KEYS.REPLAY, 0);
      queryClient.setQueryData(["scenarioState", false, 0], data);
      // Add replay started entry after clearing
      const startEntry: AuditEntry = {
        id: "audit_replay_started",
        timestamp: new Date().toISOString(),
        user: "Demo Analyst",
        action: "Replay Started",
        resource: "Canonical attack scenario — Step 0 initialized",
        ipAddress: "session-local",
        result: "Success",
        dynamic: true,
      };
      setDynamicAuditEntries([startEntry]);
      setSessionItem(SESSION_KEYS.AUDIT, [startEntry]);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/scenario/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: sessionReplayStep }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to reset scenario");
      }
      return (await res.json()) as ScenarioResetResponse;
    },
    onSuccess: (data) => {
      setSessionApplied(false);
      setSessionTimestamp(null);
      setSessionItem(SESSION_KEYS.APPLIED, false);
      setSessionItem(SESSION_KEYS.TIMESTAMP, null);
      addAuditEntry(data.auditEntry);
      queryClient.setQueryData(["scenarioState", false, sessionReplayStep], data.state);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async ({ bundleId, appliedBy }: { bundleId: string; appliedBy?: string }) => {
      const res = await fetch("/api/remediation/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId, appliedBy, step: sessionReplayStep }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to apply remediation");
      }
      return (await res.json()) as RemediationApplyResponse;
    },
    onSuccess: (data) => {
      const ts = data.state.remediationTimestamp || new Date().toISOString();
      setSessionApplied(true);
      setSessionTimestamp(ts);
      setSessionItem(SESSION_KEYS.APPLIED, true);
      setSessionItem(SESSION_KEYS.TIMESTAMP, ts);
      addAuditEntry(data.auditEntry);
      queryClient.setQueryData(["scenarioState", true, sessionReplayStep], data.state);
    },
  });

  const previewMutation = useMutation({
    mutationFn: async ({ bundleId, step }: { bundleId: string; step: number }) => {
      const res = await fetch("/api/remediation/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId, step }),
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to preview remediation");
      }
      return (await res.json()) as RemediationPreview;
    },
  });

  const advanceMutation = useMutation({
    mutationFn: async (targetStep: number) => {
      const res = await fetch(
        `/api/scenario/state?remediated=${sessionApplied}&step=${targetStep}`,
      );
      if (!res.ok) {
        await handleApiError(res, `Failed to advance to step ${targetStep}`);
      }
      const state = (await res.json()) as ScenarioState;
      if (state.replay.currentStep !== targetStep) {
        throw new Error("Response step does not match targetStep");
      }
      return { step: targetStep, state };
    },
    onSuccess: ({ step, state }) => {
      // 4. Write the response into the cache before updating sessionReplayStep
      queryClient.setQueryData(["scenarioState", sessionApplied, step], state);

      // 5. Persist/update sessionReplayStep to targetStep
      setSessionReplayStep(step);
      setSessionItem(SESSION_KEYS.REPLAY, step);

      // 6. Add audit entry
      const stepAuditTemplate = REPLAY_STEP_AUDIT[step];
      if (stepAuditTemplate) {
        const entry: AuditEntry = {
          id: `audit_replay_step_${step}`,
          timestamp: new Date().toISOString(),
          ...stepAuditTemplate,
        };
        addAuditEntry(entry);
      }
    },
  });

  const { mutateAsync: startMutateAsync } = startMutation;
  const { mutateAsync: resetMutateAsync } = resetMutation;
  const { mutateAsync: applyMutateAsync } = applyMutation;
  const { mutateAsync: previewMutateAsync } = previewMutation;

  const startScenario = useCallback(() => startMutateAsync(), [startMutateAsync]);
  const resetScenario = useCallback(() => resetMutateAsync(), [resetMutateAsync]);
  const applyRemediation = useCallback(
    (bundleId: string, appliedBy?: string) => {
      if (sessionApplied) return Promise.reject(new Error("Remediation already applied"));
      if (sessionReplayStep < 2)
        return Promise.reject(new Error("Remediation cannot be applied before Step 2"));
      return applyMutateAsync({ bundleId, appliedBy });
    },
    [applyMutateAsync, sessionReplayStep, sessionApplied],
  );
  const previewRemediation = useCallback(
    (bundleId: string) => previewMutateAsync({ bundleId, step: sessionReplayStep }),
    [previewMutateAsync, sessionReplayStep],
  );

  const isReplayPending =
    startMutation.isPending ||
    resetMutation.isPending ||
    applyMutation.isPending ||
    previewMutation.isPending ||
    advanceMutation.isPending ||
    isFetching ||
    isPending;

  const advanceReplay = useCallback(() => {
    if (sessionReplayStep >= 4 || isReplayPending) return;
    const nextStep = sessionReplayStep + 1;
    advanceMutation.mutate(nextStep);
  }, [sessionReplayStep, isReplayPending, advanceMutation]);

  const restartReplay = useCallback(async () => {
    return startMutateAsync();
  }, [startMutateAsync]);

  return {
    scenarioState,
    isLoading: isPending || !isClient,
    isError,
    error,
    startScenario,
    resetScenario,
    previewRemediation,
    applyRemediation,
    dynamicAuditEntries,
    sessionApplied,
    sessionTimestamp,
    isMutating:
      startMutation.isPending ||
      resetMutation.isPending ||
      applyMutation.isPending ||
      previewMutation.isPending,

    // Replay exports
    replayStep: sessionReplayStep,
    startReplay: startScenario,
    advanceReplay,
    restartReplay,
    canAdvanceReplay: sessionReplayStep < 4 && !sessionApplied,
    canApplyRemediation: sessionReplayStep >= 2 && !sessionApplied,
    isReplayComplete: sessionReplayStep === 4,
    isReplayPending,
  };
}

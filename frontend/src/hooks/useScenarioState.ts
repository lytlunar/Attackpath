import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { 
  ScenarioState, 
  AuditEntry, 
  RemediationPreview,
  ScenarioResetResponse,
  RemediationApplyResponse
} from '../lib/types';

// Helper for safe session storage
const SESSION_KEYS = {
  APPLIED: 'aegispath.remediationApplied',
  TIMESTAMP: 'aegispath.remediationTimestamp',
  AUDIT: 'aegispath.dynamicAuditEntries',
};

function getSessionItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = window.sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.warn(`Failed to parse sessionStorage for ${key}`, e);
    return defaultValue;
  }
}

function setSessionItem<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
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

  useEffect(() => {
    setIsClient(true);
    setSessionApplied(getSessionItem<boolean>(SESSION_KEYS.APPLIED, false));
    setSessionTimestamp(getSessionItem<string | null>(SESSION_KEYS.TIMESTAMP, null));
    setDynamicAuditEntries(getSessionItem<AuditEntry[]>(SESSION_KEYS.AUDIT, []));
  }, []);

  const addAuditEntry = useCallback((entry: AuditEntry) => {
    setDynamicAuditEntries(prev => {
      // Prevent duplicates by id
      if (prev.some(e => e.id === entry.id)) return prev;
      const next = [entry, ...prev]; // Preserve order with newest entry first
      setSessionItem(SESSION_KEYS.AUDIT, next);
      return next;
    });
  }, []);

  const handleApiError = async (res: Response, defaultMessage: string): Promise<never> => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || defaultMessage);
    }
    throw new Error("Scenario API returned a non-JSON response.");
  };

  // Fetch state
  const { data: scenarioState, isPending, isError, error } = useQuery({
    queryKey: ['scenarioState', sessionApplied],
    queryFn: async () => {
      const res = await fetch(`/api/scenario/state?remediated=${sessionApplied}`);
      if (!res.ok) {
        await handleApiError(res, `Failed to fetch state: ${res.statusText}`);
      }
      return (await res.json()) as ScenarioState;
    },
    enabled: isClient, // Don't fetch until we know the hydrated session state
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scenario/start', { method: 'POST' });
      if (!res.ok) {
        await handleApiError(res, "Failed to start scenario");
      }
      return (await res.json()) as ScenarioState;
    },
    onSuccess: (data) => {
      setSessionApplied(false);
      setSessionTimestamp(null);
      setSessionItem(SESSION_KEYS.APPLIED, false);
      setSessionItem(SESSION_KEYS.TIMESTAMP, null);
      queryClient.setQueryData(['scenarioState', false], data);
    }
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scenario/reset', { method: 'POST' });
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
      queryClient.setQueryData(['scenarioState', false], data.state);
    }
  });

  const applyMutation = useMutation({
    mutationFn: async ({ bundleId, appliedBy }: { bundleId: string, appliedBy?: string }) => {
      const res = await fetch('/api/remediation/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId, appliedBy })
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
      queryClient.setQueryData(['scenarioState', true], data.state);
    }
  });

  const previewMutation = useMutation({
    mutationFn: async (bundleId: string) => {
      const res = await fetch('/api/remediation/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleId })
      });
      if (!res.ok) {
        await handleApiError(res, "Failed to preview remediation");
      }
      return (await res.json()) as RemediationPreview;
    }
  });

  const { mutateAsync: startMutateAsync } = startMutation;
  const { mutateAsync: resetMutateAsync } = resetMutation;
  const { mutateAsync: applyMutateAsync } = applyMutation;
  const { mutateAsync: previewMutateAsync } = previewMutation;

  const startScenario = useCallback(() => startMutateAsync(), [startMutateAsync]);
  const resetScenario = useCallback(() => resetMutateAsync(), [resetMutateAsync]);
  const applyRemediation = useCallback((bundleId: string, appliedBy?: string) => applyMutateAsync({ bundleId, appliedBy }), [applyMutateAsync]);
  const previewRemediation = useCallback((bundleId: string) => previewMutateAsync(bundleId), [previewMutateAsync]);

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
    isMutating: startMutation.isPending || resetMutation.isPending || applyMutation.isPending || previewMutation.isPending
  };
}

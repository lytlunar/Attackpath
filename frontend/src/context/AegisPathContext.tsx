/**
 * AegisPathContext — Global shared state for the entire AegisPath application.
 *
 * Single source of truth. All pages READ from this context.
 * Only Risk Simulation writes remediationApplied.
 * All other pages are read-only consumers.
 *
 * Core attack path: USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01
 * Chokepoint:       WST_02 → SVC_01  (severed when remediationApplied = true)
 */

import { createContext, useContext, useMemo, useCallback, useState, type ReactNode } from "react";
import { useScenarioState } from "../hooks/useScenarioState";
import type { ScenarioState, AuditEntry, RemediationPreview } from "../lib/types";

// ─── Static data model ────────────────────────────────────────────────────────

export const REMEDIATION_BUNDLE = [
  {
    id: "patch_wst_02", // Preserved for Phase 2 API expectations
    label: "Patch WST_02 Remediation Bundle",
    description: "Apply critical patch to WST_02, isolate credentials, and rotate SVC_01 password.",
  },
  {
    id: "rem_lpe",
    label: "Patch Local Privilege Escalation",
    description:
      "Install security updates addressing the local privilege escalation weakness on WST_02.",
  },
  {
    id: "rem_cred",
    label: "Implement Credential Protection",
    description:
      "Apply Credential Guard-style memory hardening to reduce credential exposure in LSASS.",
  },
  {
    id: "rem_rotate",
    label: "Rotate SVC_01 Credentials",
    description:
      "Change the SVC_01 service account password and invalidate all active Kerberos TGTs.",
  },
];

export const ATTACK_PATH_NODES = ["USR_03", "WST_02", "SVC_01", "SRV_01", "DC_01"] as const;

/** Nodes that become visually muted when remediation is applied */
export const MUTED_AFTER_REMEDIATION = ["SVC_01", "SRV_01", "DC_01"] as const;

// ─── Context type ─────────────────────────────────────────────────────────────

interface Metrics {
  riskScore: number;
  blastRadius: number;
  riskLevel: "Critical" | "High" | "Medium" | "Low";
  pathStatus: "Active" | "Disrupted" | "Loading";
  securityGain: number;
}

interface AegisPathContextType {
  /** Master state flag. Only Risk Simulation writes this. All other pages read it. */
  remediationApplied: boolean;

  /** Called by Risk Simulation when Apply Bundle is triggered */
  applyRemediation: () => void;

  /** Called by Risk Simulation when Reset is triggered */
  resetRemediation: () => void;

  /** Current metrics derived from API ScenarioState */
  metrics: Metrics;

  /** ISO timestamp of when remediation was applied (null if not applied) */
  remediationTimestamp: string | null;

  // --- Extended API driven state ---
  scenarioState?: ScenarioState;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  previewRemediation: (bundleId: string) => Promise<RemediationPreview>;
  dynamicAuditEntries: AuditEntry[];
  isMutating: boolean;

  // --- Replay Controls ---
  replayStep: number;
  startReplay: () => void;
  advanceReplay: () => void;
  restartReplay: () => Promise<void>;
  canAdvanceReplay: boolean;
  canApplyRemediation: boolean;
  isReplayComplete: boolean;
  isReplayPending: boolean;
  phase3Mode: boolean;
  togglePhase3Mode: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AegisPathContext = createContext<AegisPathContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AegisPathProvider({ children }: { children: ReactNode }) {
  const [phase3Mode, setPhase3Mode] = useState(false);
  const {
    scenarioState,
    isLoading,
    isError,
    error,
    resetScenario,
    applyRemediation: applyRemediationApi,
    previewRemediation,
    dynamicAuditEntries,
    sessionApplied,
    sessionTimestamp,
    isMutating,
    replayStep,
    startReplay,
    advanceReplay,
    restartReplay,
    canAdvanceReplay,
    canApplyRemediation,
    isReplayComplete,
    isReplayPending,
  } = useScenarioState();

  const applyRemediation = useCallback(() => {
    if (isMutating) return;
    applyRemediationApi("patch_wst_02").catch((err) => {
      console.error("Failed to apply remediation:", err);
    });
  }, [isMutating, applyRemediationApi]);

  const resetRemediation = useCallback(() => {
    if (isMutating) return;
    resetScenario().catch((err) => {
      console.error("Failed to reset remediation:", err);
    });
  }, [isMutating, resetScenario]);

  // Map API state to old metrics format to preserve existing UI behavior.
  // When loading, default to a safe neutral baseline representation to
  // prevent consumer crashes without faking calculated values.
  const metrics: Metrics = useMemo(
    () =>
      scenarioState
        ? {
            riskScore: scenarioState.score.total,
            blastRadius: scenarioState.blastRadius.percentage,
            riskLevel: scenarioState.score.label,
            pathStatus: scenarioState.pathStatus,
            securityGain: scenarioState.securityGain,
          }
        : {
            riskScore: 0,
            blastRadius: 0,
            riskLevel: "Low",
            pathStatus: "Loading",
            securityGain: 0,
          },
    [scenarioState],
  );

  const contextValue = useMemo(
    () => ({
      remediationApplied: sessionApplied,
      applyRemediation,
      resetRemediation,
      metrics,
      remediationTimestamp: sessionTimestamp,
      scenarioState,
      isLoading,
      isError,
      error: error instanceof Error ? error : null,
      previewRemediation,
      dynamicAuditEntries,
      isMutating,
      replayStep,
      startReplay,
      advanceReplay,
      restartReplay,
      canAdvanceReplay,
      canApplyRemediation,
      isReplayComplete,
      isReplayPending,
      phase3Mode,
      togglePhase3Mode: () => setPhase3Mode(!phase3Mode),
    }),
    [
      sessionApplied,
      applyRemediation,
      resetRemediation,
      metrics,
      sessionTimestamp,
      scenarioState,
      isLoading,
      isError,
      error,
      previewRemediation,
      dynamicAuditEntries,
      isMutating,
      replayStep,
      startReplay,
      advanceReplay,
      restartReplay,
      canAdvanceReplay,
      canApplyRemediation,
      isReplayComplete,
      isReplayPending,
      phase3Mode,
    ],
  );

  return <AegisPathContext.Provider value={contextValue}>{children}</AegisPathContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAegisPath(): AegisPathContextType {
  const ctx = useContext(AegisPathContext);
  if (!ctx) {
    throw new Error("useAegisPath must be used inside AegisPathProvider");
  }
  return ctx;
}

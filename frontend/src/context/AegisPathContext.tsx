import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useCanonicalScenario } from "../hooks/useCanonicalScenario";
import type { CanonicalAnalysisResult } from "../lib/canonicalEngine";

// ─── Static data model ────────────────────────────────────────────────────────

export const REMEDIATION_BUNDLE = [
  {
    id: "patch_wst_02",
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

export const MUTED_AFTER_REMEDIATION = ["SVC_01", "SRV_01", "DC_01"] as const;

// ─── Context type ─────────────────────────────────────────────────────────────

interface AegisPathContextType {
  canonicalResult?: CanonicalAnalysisResult;
  canonicalIsLoading: boolean;
  canonicalIsError: boolean;
  canonicalError: Error | null;
  canonicalSessionInput: ReturnType<typeof useCanonicalScenario>["sessionInput"];
  processNextEvent: () => void;
  processAllEvents: () => void;
  applyCanonicalRemediation: (actionId: string) => void;
  resetCanonicalRemediation: () => void;
  resetAnalysis: () => void;
  canProcessNext: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AegisPathContext = createContext<AegisPathContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AegisPathProvider({ children }: { children: ReactNode }) {
  const canonical = useCanonicalScenario();

  const contextValue = useMemo(
    () => ({
      canonicalResult: canonical.canonicalResult,
      canonicalIsLoading: canonical.isLoading,
      canonicalIsError: canonical.isError,
      canonicalError: canonical.error instanceof Error ? canonical.error : null,
      canonicalSessionInput: canonical.sessionInput,
      processNextEvent: canonical.processNextEvent,
      processAllEvents: canonical.processAllEvents,
      applyCanonicalRemediation: canonical.applyRemediation,
      resetCanonicalRemediation: canonical.resetRemediation,
      resetAnalysis: canonical.resetAnalysis,
      canProcessNext: canonical.canProcessNext,
    }),
    [
      canonical.canonicalResult,
      canonical.isLoading,
      canonical.isError,
      canonical.error,
      canonical.sessionInput,
      canonical.processNextEvent,
      canonical.processAllEvents,
      canonical.applyRemediation,
      canonical.resetRemediation,
      canonical.resetAnalysis,
      canonical.canProcessNext,
    ],
  );

  return (
    <AegisPathContext.Provider value={contextValue}>{children}</AegisPathContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAegisPath() {
  const context = useContext(AegisPathContext);
  if (!context) {
    throw new Error("useAegisPath must be used within an AegisPathProvider");
  }
  return context;
}

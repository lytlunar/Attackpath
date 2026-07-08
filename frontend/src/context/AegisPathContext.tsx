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

import { createContext, useContext, useState, type ReactNode } from "react";

// ─── Static data model ────────────────────────────────────────────────────────

export const METRICS_BEFORE = {
  riskScore: 500,
  blastRadius: 85,
  riskLevel: "Critical" as const,
  pathStatus: "Active" as const,
  securityGain: 0,
};

export const METRICS_AFTER = {
  riskScore: 120,
  blastRadius: 30,
  riskLevel: "Medium" as const,
  pathStatus: "Disrupted" as const,
  securityGain: 380,
};

export const REMEDIATION_BUNDLE = [
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

interface AegisPathContextType {
  /** Master state flag. Only Risk Simulation writes this. All other pages read it. */
  remediationApplied: boolean;

  /** Called by Risk Simulation when Apply Bundle is triggered */
  applyRemediation: () => void;

  /** Called by Risk Simulation when Reset is triggered */
  resetRemediation: () => void;

  /** Current metrics — switches between BEFORE and AFTER based on remediationApplied */
  metrics: typeof METRICS_BEFORE | typeof METRICS_AFTER;

  /** ISO timestamp of when remediation was applied (null if not applied) */
  remediationTimestamp: string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AegisPathContext = createContext<AegisPathContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AegisPathProvider({ children }: { children: ReactNode }) {
  const [remediationApplied, setRemediationApplied] = useState(false);
  const [remediationTimestamp, setRemediationTimestamp] = useState<string | null>(null);

  const applyRemediation = () => {
    setRemediationApplied(true);
    setRemediationTimestamp(new Date().toISOString());
  };

  const resetRemediation = () => {
    setRemediationApplied(false);
    setRemediationTimestamp(null);
  };

  const metrics = remediationApplied ? METRICS_AFTER : METRICS_BEFORE;

  return (
    <AegisPathContext.Provider
      value={{
        remediationApplied,
        applyRemediation,
        resetRemediation,
        metrics,
        remediationTimestamp,
      }}
    >
      {children}
    </AegisPathContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAegisPath(): AegisPathContextType {
  const ctx = useContext(AegisPathContext);
  if (!ctx) {
    throw new Error("useAegisPath must be used inside AegisPathProvider");
  }
  return ctx;
}

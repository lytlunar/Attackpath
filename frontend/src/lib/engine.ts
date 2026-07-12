// frontend/src/lib/engine.ts
import { AegisPathModel } from "../data/aegisPathModel";
import type {
  ScenarioState,
  EvidencedAccessEdge,
  GraphNodeAnalysisState,
  GraphEdgeAnalysisState,
  ScoreBreakdown,
  BlastRadiusResult,
  RemediationAction,
  ReplayStep,
  ReplayStatus,
  SecurityEvent,
  Detection,
  IncidentReport,
} from "./types";

export const evidencedAccessEdges: EvidencedAccessEdge[] = [
  {
    edgeId: "e12",
    source: "SVC_01",
    target: "SRV_02",
    basis: "Compromised service credential grants access",
    evidenceType: "scenario",
  },
  {
    edgeId: "e13",
    source: "SRV_01",
    target: "DB_01",
    basis: "Compromised server has established database access",
    evidenceType: "scenario",
  },
];

// Deterministic replay progression based on explicit Phase 1 JSON outputs
// These are explicitly derived canonical states, not dynamic formula outputs.
const PROGRESSION = [
  {
    score: {
      total: 33,
      factorPrivilege: 26,
      factorPathCompleteness: 3.5,
      factorBlastRadius: 3.5,
      label: "Medium",
    },
    blast: 14,
    cov: 0,
    pathStatus: "Disrupted",
    replayStatus: "Not Started",
  },
  {
    score: {
      total: 45,
      factorPrivilege: 30,
      factorPathCompleteness: 10,
      factorBlastRadius: 5,
      label: "High",
    },
    blast: 20,
    cov: 0.25,
    pathStatus: "Active",
    replayStatus: "In Progress",
  },
  {
    score: {
      total: 60,
      factorPrivilege: 35,
      factorPathCompleteness: 18,
      factorBlastRadius: 7,
      label: "High",
    },
    blast: 30,
    cov: 0.5,
    pathStatus: "Active",
    replayStatus: "In Progress",
  },
  {
    score: {
      total: 75,
      factorPrivilege: 38,
      factorPathCompleteness: 26,
      factorBlastRadius: 11,
      label: "Critical",
    },
    blast: 40,
    cov: 0.75,
    pathStatus: "Active",
    replayStatus: "In Progress",
  },
  {
    score: {
      total: 88,
      factorPrivilege: 40,
      factorPathCompleteness: 35,
      factorBlastRadius: 12.5,
      label: "Critical",
    },
    blast: 50,
    cov: 1.0,
    pathStatus: "Active",
    replayStatus: "Completed",
  },
];

const generateDetections = (step: number): Detection[] => {
  const dets: Detection[] = [];
  if (step >= 1) {
    dets.push({
      detectionId: "det_01",
      eventId: "evt_001",
      nodeId: "USR_03",
      detectionType: "InitialAccess",
      technique: "T1078.004",
      techniqueName: "Valid Accounts: Cloud Accounts",
      confidence: "High",
      privilegeLevelGained: "user",
      status: "Open",
    });
  }
  if (step >= 2) {
    dets.push({
      detectionId: "det_02",
      eventId: "evt_002",
      nodeId: "WST_02",
      detectionType: "CredentialAccess",
      technique: "T1003.001",
      techniqueName: "OS Credential Dumping: LSASS Memory",
      confidence: "High",
      privilegeLevelGained: "localAdmin",
      status: "Open",
    });
  }
  if (step >= 3) {
    dets.push({
      detectionId: "det_03",
      eventId: "evt_003",
      nodeId: "SVC_01",
      detectionType: "LateralMovement",
      technique: "T1021.002",
      techniqueName: "Remote Services: SMB Windows Admin Shares",
      confidence: "High",
      privilegeLevelGained: "service",
      status: "Open",
    });
  }
  if (step >= 4) {
    dets.push({
      detectionId: "det_04",
      eventId: "evt_004",
      nodeId: "DC_01",
      detectionType: "CredentialAccess",
      technique: "T1003.006",
      techniqueName: "OS Credential Dumping: DCSync",
      confidence: "High",
      privilegeLevelGained: "domainAdmin",
      status: "Open",
    });
  }
  return dets;
};

const buildIncidentReport = (
  step: number,
  remediated: boolean,
  score: ScoreBreakdown,
  blastRadius: BlastRadiusResult,
): IncidentReport => {
  const timeline = [];
  const iocs = [];

  if (step >= 1) {
    timeline.unshift({
      timestamp: "2026-07-05 08:58",
      event: "Initial Access — AiTM token replay against USR_03",
      nodeId: "USR_03",
    });
  }
  if (step >= 2) {
    timeline.unshift({
      timestamp: "2026-07-05 11:00",
      event: "Credential Dumping — LSASS MiniDump behavior on WST_02",
      nodeId: "WST_02",
    });
    iocs.push({ type: "Process / DLL", value: "comsvcs.dll", confidence: "High" });
    iocs.push({ type: "Memory Artifact", value: "LSASS MiniDump on WST_02", confidence: "High" });
  }
  if (step >= 3) {
    timeline.unshift({
      timestamp: "2026-07-05 13:29",
      event: "Lateral Movement — Kerberos/SMB movement through SVC_01 toward SRV_01",
      nodeId: "SVC_01",
    });
    iocs.push({
      type: "Protocol / Mvt",
      value: "Kerberos / SMB toward SRV_01",
      confidence: "Medium",
    });
  }
  if (step >= 4) {
    timeline.unshift({
      timestamp: "2026-07-05 14:14",
      event: "Domain Escalation — DCSync / DRSUAPI activity targeting DC_01",
      nodeId: "DC_01",
    });
    iocs.push({ type: "Replication", value: "DRSUAPI / DCSync activity", confidence: "High" });
  }

  // Use fixed timestamp for pure deterministic structural equality
  const staticTimestamp = "2026-07-05T15:00:00.000Z";

  return {
    generatedAt: staticTimestamp,
    pathStatus: remediated ? "Disrupted" : step === 0 ? "Disrupted" : "Active",
    criticalPath: ["USR_03", "WST_02", "SVC_01", "SRV_01", "DC_01"],
    chokepointEdgeId: "e2",
    score,
    blastRadius,
    activePathCoverage: remediated ? 0.25 : PROGRESSION[step].cov,
    evidenceCoverage: remediated ? 1.0 : PROGRESSION[step].cov,
    timeline,
    iocs,
    remediationApplied: remediated,
    remediationTimestamp: remediated ? new Date().toISOString() : null,
  };
};

export function calculateScenarioState(remediated: boolean, step: ReplayStep = 4): ScenarioState {
  // Clamp step safely if caller passes invalid value
  const safeStep: ReplayStep = (step < 0 ? 0 : step > 4 ? 4 : step) as ReplayStep;
  const prog = PROGRESSION[safeStep];

  const criticalPath = ["USR_03", "WST_02", "SVC_01", "SRV_01", "DC_01"];
  const chokepointEdgeId = "e2"; // WST_02 -> SVC_01

  // Determine reachable nodes
  const reachableNodes = new Set<string>();
  if (remediated) {
    reachableNodes.add("USR_03");
    reachableNodes.add("WST_02");
  } else {
    if (safeStep >= 1) {
      reachableNodes.add("USR_03");
      reachableNodes.add("WST_02");
    }
    if (safeStep >= 2) {
      reachableNodes.add("SVC_01");
    }
    if (safeStep >= 3) {
      reachableNodes.add("SRV_01");
    }
    if (safeStep >= 4) {
      reachableNodes.add("DC_01");
    }

    // Add explicitly configured evidenced access edges if source is reachable
    evidencedAccessEdges.forEach((ee) => {
      if (reachableNodes.has(ee.source)) {
        reachableNodes.add(ee.target);
      }
    });
  }

  const nodes: GraphNodeAnalysisState[] = AegisPathModel.graphNodes.map((n) => {
    const reachable = reachableNodes.has(n.id);
    let severed = false;
    if (remediated && criticalPath.includes(n.id)) {
      if (n.id === "SVC_01" || n.id === "SRV_01" || n.id === "DC_01") {
        severed = true;
      }
    }
    return {
      id: n.id,
      role: n.role as "critical" | "context",
      status: n.status as any,
      onCriticalPath: criticalPath.includes(n.id),
      reachableViaActivePath: reachable,
      severed: severed,
    };
  });

  const edges: GraphEdgeAnalysisState[] = AegisPathModel.graphEdges.map((e) => {
    const isChokepoint = e.id === chokepointEdgeId;
    const severed = remediated && isChokepoint;

    // Downgrade unrevealed canonical edges to "context" so they appear inactive in UI
    let effectiveRole = e.role;
    if (!remediated && e.role !== "context") {
      if (e.id === "e1" && safeStep < 1) effectiveRole = "context";
      if (e.id === "e2" && safeStep < 2) effectiveRole = "context";
      if (e.id === "e3" && safeStep < 3) effectiveRole = "context";
      if (e.id === "e4" && safeStep < 4) effectiveRole = "context";
    }

    const isEvidenced = evidencedAccessEdges.find((ee) => ee.edgeId === e.id);
    let evidenceObj = undefined;

    if (isEvidenced) {
      evidenceObj = {
        edgeId: e.id,
        evidenceType: isEvidenced.evidenceType,
        description: isEvidenced.basis,
      };
    } else if (effectiveRole === "critical" || effectiveRole === "chokepoint") {
      evidenceObj = {
        edgeId: e.id,
        evidenceType: "direct" as const,
        description: "Evidenced by threat events",
      };
    }

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      role: effectiveRole as "critical" | "chokepoint" | "context",
      severed,
      isChokepoint,
      evidence: evidenceObj,
    };
  });

  const activePathCoverage = remediated ? 0.25 : prog.cov;
  const evidenceCoverage = remediated ? 1.0 : prog.cov;

  const blastRadius: BlastRadiusResult = {
    percentage: remediated ? 14 : prog.blast,
    reachableAssetIds: Array.from(reachableNodes),
    totalMonitoredAssets: AegisPathModel.graphNodes.length,
    reachableCount: reachableNodes.size,
  };

  const score: ScoreBreakdown = remediated
    ? {
        total: 33,
        factorPrivilege: 26,
        factorPathCompleteness: 3.5,
        factorBlastRadius: 3.5,
        label: "Medium",
      }
    : (prog.score as ScoreBreakdown);

  const chokepointState = edges.find((e) => e.isChokepoint)!;

  const primaryFix: RemediationAction = {
    id: "patch_wst_02",
    label: "Patch WST_02 Remediation Bundle",
    description: "Apply critical patch to WST_02, isolate credentials, and rotate SVC_01 password.",
    targetNodeId: "WST_02",
    targetEdgeId: chokepointEdgeId,
  };

  const remediationBundle = [primaryFix];

  const mapEvent = (evt: any): SecurityEvent => {
    let edgeId = "";
    let sourceNodeId = "";
    let targetNodeId = "";
    if (evt.id === "evt_001") {
      edgeId = "e1";
      sourceNodeId = "USR_03";
      targetNodeId = "WST_02";
    } else if (evt.id === "evt_002") {
      edgeId = "e2";
      sourceNodeId = "WST_02";
      targetNodeId = "SVC_01";
    } else if (evt.id === "evt_003") {
      edgeId = "e3";
      sourceNodeId = "SVC_01";
      targetNodeId = "SRV_01";
    } else if (evt.id === "evt_004") {
      edgeId = "e4";
      sourceNodeId = "SRV_01";
      targetNodeId = "DC_01";
    }
    return { ...evt, nodeId: evt.node, edgeId, sourceNodeId, targetNodeId } as SecurityEvent;
  };

  const activeEvents = AegisPathModel.threatEvents.slice(0, safeStep).map(mapEvent);

  const activeDetections = generateDetections(safeStep);

  const staticTimestamp = "2026-07-05T15:00:00.000Z";

  return {
    remediationApplied: remediated,
    remediationTimestamp: remediated ? new Date().toISOString() : null,
    criticalPath,
    chokepointEdge: chokepointState,
    pathStatus: remediated ? "Disrupted" : (prog.pathStatus as "Active" | "Disrupted"),
    nodes,
    edges,
    score,
    blastRadius,
    securityGain: remediated ? 55 : 0,
    primaryFix,
    remediationBundle,
    evidenceCoverage,
    activePathCoverage,

    replay: {
      currentStep: safeStep,
      totalSteps: 4,
      status: remediated ? "Remediated" : (prog.replayStatus as ReplayStatus),
    },
    activeEvents,
    activeDetections,
    incidentReport: buildIncidentReport(safeStep, remediated, score, blastRadius),
  };
}

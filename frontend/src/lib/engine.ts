// frontend/src/lib/engine.ts
import { AegisPathModel } from '../data/aegisPathModel';
import type {
  ScenarioState,
  EvidencedAccessEdge,
  GraphNodeAnalysisState,
  GraphEdgeAnalysisState,
  ScoreBreakdown,
  BlastRadiusResult,
  RemediationAction
} from './types';

export const evidencedAccessEdges: EvidencedAccessEdge[] = [
  {
    edgeId: "e12",
    source: "SVC_01",
    target: "SRV_02",
    basis: "Compromised service credential grants access",
    evidenceType: "scenario"
  },
  {
    edgeId: "e13",
    source: "SRV_01",
    target: "DB_01",
    basis: "Compromised server has established database access",
    evidenceType: "scenario"
  }
];

export function calculateScenarioState(remediated: boolean): ScenarioState {
  const criticalPath = ["USR_03", "WST_02", "SVC_01", "SRV_01", "DC_01"];
  const chokepointEdgeId = "e2"; // WST_02 -> SVC_01

  // Determine reachable nodes
  const reachableNodes = new Set<string>();
  if (remediated) {
    reachableNodes.add("USR_03");
    reachableNodes.add("WST_02");
  } else {
    reachableNodes.add("USR_03");
    reachableNodes.add("WST_02");
    reachableNodes.add("SVC_01");
    reachableNodes.add("SRV_01");
    reachableNodes.add("DC_01");
    
    // Add explicitly configured evidenced access edges
    evidencedAccessEdges.forEach(ee => {
      if (reachableNodes.has(ee.source)) {
        reachableNodes.add(ee.target);
      }
    });
  }

  const nodes: GraphNodeAnalysisState[] = AegisPathModel.graphNodes.map(n => {
    const reachable = reachableNodes.has(n.id);
    let severed = false;
    if (remediated && criticalPath.includes(n.id)) {
      if (n.id === "SVC_01" || n.id === "SRV_01" || n.id === "DC_01") {
        severed = true;
      }
    }
    return {
      id: n.id,
      role: (n.role as "critical" | "context"),
      status: (n.status as any),
      onCriticalPath: criticalPath.includes(n.id),
      reachableViaActivePath: reachable,
      severed: severed
    };
  });

  const edges: GraphEdgeAnalysisState[] = AegisPathModel.graphEdges.map(e => {
    const isChokepoint = e.id === chokepointEdgeId;
    const severed = remediated && isChokepoint;
    
    const isEvidenced = evidencedAccessEdges.find(ee => ee.edgeId === e.id);
    let evidenceObj = undefined;
    
    if (isEvidenced) {
      evidenceObj = {
        edgeId: e.id,
        evidenceType: isEvidenced.evidenceType,
        description: isEvidenced.basis
      };
    } else if (e.role === "critical" || e.role === "chokepoint") {
      evidenceObj = {
        edgeId: e.id,
        evidenceType: "direct" as const,
        description: "Evidenced by threat events"
      };
    }

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      role: (e.role as "critical" | "chokepoint" | "context"),
      severed,
      isChokepoint,
      evidence: evidenceObj
    };
  });

  // Calculate Blast Radius
  const blastRadius: BlastRadiusResult = {
    percentage: remediated ? 14 : 50,
    reachableAssetIds: Array.from(reachableNodes),
    totalMonitoredAssets: AegisPathModel.graphNodes.length,
    reachableCount: reachableNodes.size
  };

  // Calculate Score
  const score: ScoreBreakdown = remediated
    ? {
        total: 33,
        factorPrivilege: 26,
        factorPathCompleteness: 3.5,
        factorBlastRadius: 3.5,
        label: "Medium"
      }
    : {
        total: 88,
        factorPrivilege: 40,
        factorPathCompleteness: 35,
        factorBlastRadius: 12.5,
        label: "Critical"
      };

  const chokepointState = edges.find(e => e.isChokepoint)!;

  const primaryFix: RemediationAction = {
    id: "patch_wst_02",
    label: "Patch WST_02 Remediation Bundle",
    description: "Apply critical patch to WST_02, isolate credentials, and rotate SVC_01 password.",
    targetNodeId: "WST_02",
    targetEdgeId: chokepointEdgeId
  };

  const remediationBundle = [primaryFix];

  return {
    remediationApplied: remediated,
    remediationTimestamp: remediated ? new Date().toISOString() : null,
    criticalPath,
    chokepointEdge: chokepointState,
    pathStatus: remediated ? "Disrupted" : "Active",
    nodes,
    edges,
    score,
    blastRadius,
    securityGain: remediated ? 55 : 0,
    primaryFix,
    remediationBundle,
    evidenceCoverage: 1.0,
    activePathCoverage: remediated ? 0.25 : 1.0
  };
}

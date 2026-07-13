import { AegisPathModel } from "../data/aegisPathModel";
import type { SyntheticDetection } from "./detectionRules";
import { type DetectionGraph, findReachableEntityIds } from "./detectionGraph";

export type PriorityScoreFactor = {
  id: string;
  label: string;
  rawValue: number | string | boolean;
  normalizedValue: number;
  weight: number;
  contribution: number;
  explanation: string;
  supportingDetectionIds: string[];
  supportingEntityIds: string[];
  supportingTechniqueIds: string[];
};

export type AttackPathPriorityResult = {
  synthetic: true;
  score: number;
  band: "low" | "moderate" | "high" | "critical";
  formulaVersion: string;
  factors: PriorityScoreFactor[];
  summary: string;
  inputs: {
    detectionCount: number;
    graphNodeCount: number;
    graphEdgeCount: number;
    reachableEntityCount: number;
    criticalTargetIds: string[];
    serviceAccountIds: string[];
    privilegedAccessDetected: boolean;
    credentialAccessDetected: boolean;
  };
  limitations: string[];
};

function roundToTwo(num: number): number {
  return Math.round(num * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

function getScoreBand(score: number): "low" | "moderate" | "high" | "critical" {
  if (score < 25) return "low";
  if (score < 50) return "moderate";
  if (score < 75) return "high";
  return "critical";
}

const SEVERITY_VALUES: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const CONFIDENCE_VALUES: Record<string, number> = { low: 1, medium: 2, high: 3 };

export function calculateAttackPathPriority(
  detections: readonly SyntheticDetection[],
  graph: DetectionGraph
): AttackPathPriorityResult {
  const limitations: string[] = [
    "The score is based on synthetic demonstration events.",
    "Asset criticality is derived from the local AegisPath baseline model.",
    "Baseline topology edges are not used as detection evidence.",
    "This is an AegisPath synthetic-demo prioritization score, not a probability of compromise or an industry-standard risk rating."
  ];

  if (detections.length === 0) {
    limitations.push("No validated synthetic detections were available to score.");
    return {
      synthetic: true,
      score: 0,
      band: "low",
      formulaVersion: "1.0",
      factors: [],
      summary: "No Priority Score generated due to empty detection input.",
      inputs: {
        detectionCount: 0,
        graphNodeCount: 0,
        graphEdgeCount: 0,
        reachableEntityCount: 0,
        criticalTargetIds: [],
        serviceAccountIds: [],
        privilegedAccessDetected: false,
        credentialAccessDetected: false
      },
      limitations
    };
  }

  // Factor 1: Detection Severity (Max 25)
  let maxSeverity = 0;
  let severitySum = 0;
  detections.forEach(d => {
    const val = SEVERITY_VALUES[d.severity] || 1;
    if (val > maxSeverity) maxSeverity = val;
    severitySum += val;
  });
  const avgSeverity = severitySum / detections.length;
  // Formula: (Max / 4) * 0.6 + (Avg / 4) * 0.4
  const sevNorm = (maxSeverity / 4) * 0.6 + (avgSeverity / 4) * 0.4;
  const sevWeight = 25;
  const sevContribution = roundToTwo(sevNorm * sevWeight);

  const factorSeverity: PriorityScoreFactor = {
    id: "f_severity",
    label: "Detection Severity",
    rawValue: maxSeverity,
    normalizedValue: roundToTwo(sevNorm),
    weight: sevWeight,
    contribution: sevContribution,
    explanation: "Derived from maximum and average severity of all synthetic detections.",
    supportingDetectionIds: uniqueSorted(detections.map(d => d.id)),
    supportingEntityIds: [],
    supportingTechniqueIds: []
  };

  // Factor 2: Detection Confidence (Max 10)
  let maxConfidence = 0;
  let confidenceSum = 0;
  detections.forEach(d => {
    const val = CONFIDENCE_VALUES[d.confidence] || 1;
    if (val > maxConfidence) maxConfidence = val;
    confidenceSum += val;
  });
  const avgConfidence = confidenceSum / detections.length;
  const confNorm = (maxConfidence / 3) * 0.5 + (avgConfidence / 3) * 0.5;
  const confWeight = 10;
  const confContribution = roundToTwo(confNorm * confWeight);

  const factorConfidence: PriorityScoreFactor = {
    id: "f_confidence",
    label: "Detection Confidence",
    rawValue: avgConfidence,
    normalizedValue: roundToTwo(confNorm),
    weight: confWeight,
    contribution: confContribution,
    explanation: "Derived from maximum and average confidence levels.",
    supportingDetectionIds: uniqueSorted(detections.map(d => d.id)),
    supportingEntityIds: [],
    supportingTechniqueIds: []
  };

  // Factor 3: Credential-access exposure (Max 15)
  const credDets = detections.filter(d =>
    d.mitre.techniques.some(t => t.id === "T1003.001" || t.id === "T1003.006")
  );
  const credTechs = new Set<string>();
  credDets.forEach(d => d.mitre.techniques.forEach(t => {
    if (t.id === "T1003.001" || t.id === "T1003.006") credTechs.add(t.id);
  }));

  let credNorm = 0;
  if (credTechs.size === 1) credNorm = 0.6;
  if (credTechs.size >= 2) credNorm = 1.0;

  const credWeight = 15;
  const credContribution = roundToTwo(credNorm * credWeight);

  const factorCredential: PriorityScoreFactor = {
    id: "f_credential",
    label: "Credential Access Exposure",
    rawValue: credTechs.size,
    normalizedValue: credNorm,
    weight: credWeight,
    contribution: credContribution,
    explanation: credTechs.size === 0 ? "No specific credential access techniques detected."
                 : credTechs.size === 1 ? "One credential access technique detected."
                 : "Multiple distinct credential access techniques detected (e.g., LSASS + DCSync).",
    supportingDetectionIds: uniqueSorted(credDets.map(d => d.id)),
    supportingEntityIds: uniqueSorted(credDets.flatMap(d => d.entities.assetIds)),
    supportingTechniqueIds: uniqueSorted(Array.from(credTechs))
  };

  // Factor 4: Service-account involvement (Max 10)
  const svcDets = detections.filter(d =>
    d.entities.actorIds.some(id => {
      const bn = AegisPathModel.graphNodes.find(n => n.id === id);
      return bn?.type === "Service Account";
    })
  );

  const svcIds = uniqueSorted(svcDets.flatMap(d => d.entities.actorIds.filter(id => {
    const bn = AegisPathModel.graphNodes.find(n => n.id === id);
    return bn?.type === "Service Account";
  })));

  const svcNorm = svcIds.length > 0 ? 1.0 : 0.0;
  const svcWeight = 10;
  const svcContribution = roundToTwo(svcNorm * svcWeight);

  const factorServiceAccount: PriorityScoreFactor = {
    id: "f_service_account",
    label: "Service Account Involvement",
    rawValue: svcIds.length > 0,
    normalizedValue: svcNorm,
    weight: svcWeight,
    contribution: svcContribution,
    explanation: svcIds.length > 0 ? "Service accounts are involved as actors, increasing lateral capability." : "No service accounts detected as actors.",
    supportingDetectionIds: uniqueSorted(svcDets.map(d => d.id)),
    supportingEntityIds: svcIds,
    supportingTechniqueIds: uniqueSorted(svcDets.flatMap(d => d.mitre.techniques.map(t => t.id)))
  };

  // Factor 5: Privileged or critical-target access (Max 20)
  const privDets = detections.filter(d =>
    d.mitre.techniques.some(t => t.id === "T1003.006") ||
    d.entities.assetIds.some(id => {
      const bn = AegisPathModel.graphNodes.find(n => n.id === id);
      return bn?.status === "critical_target";
    })
  );
  const criticalTargetIds = uniqueSorted(privDets.flatMap(d => d.entities.assetIds.filter(id => {
    const bn = AegisPathModel.graphNodes.find(n => n.id === id);
    return bn?.status === "critical_target";
  })));

  let privNorm = 0;
  if (privDets.length > 0) privNorm = 0.5;
  if (criticalTargetIds.length > 0 || credTechs.has("T1003.006")) privNorm = 1.0;

  const privWeight = 20;
  const privContribution = roundToTwo(privNorm * privWeight);

  const factorPrivileged: PriorityScoreFactor = {
    id: "f_privileged",
    label: "Privileged / Critical Target Access",
    rawValue: privDets.length > 0,
    normalizedValue: privNorm,
    weight: privWeight,
    contribution: privContribution,
    explanation: privNorm === 1.0 ? "Explicit critical target access or DCSync behavior detected."
                 : privNorm > 0 ? "Privileged behavior detected."
                 : "No critical target or highly privileged behavior detected.",
    supportingDetectionIds: uniqueSorted(privDets.map(d => d.id)),
    supportingEntityIds: criticalTargetIds,
    supportingTechniqueIds: uniqueSorted(privDets.flatMap(d => d.mitre.techniques.map(t => t.id)))
  };

  // Factor 6: Detection-supported reachability (Max 15)
  // Reachable definition: The maximum number of downstream entities reachable from any single detection-supported source node, excluding the source itself.
  let maxReachableCount = 0;
  let reachesCritical = false;
  graph.nodes.forEach(node => {
    const reachable = findReachableEntityIds(graph, node.id);
    if (reachable.length > maxReachableCount) {
      maxReachableCount = reachable.length;
    }
    const bnReachable = reachable.map(r => AegisPathModel.graphNodes.find(n => n.id === r));
    if (bnReachable.some(bn => bn?.status === "critical_target")) {
      reachesCritical = true;
    }
  });

  let reachNorm = 0;
  if (graph.edges.length > 0) {
    reachNorm = 0.5; // Some detection-supported edges exist
    if (maxReachableCount >= 2) reachNorm = 0.75;
    if (reachesCritical) reachNorm = 1.0;
  }

  const reachWeight = 15;
  const reachContribution = roundToTwo(reachNorm * reachWeight);

  const factorReachability: PriorityScoreFactor = {
    id: "f_reachability",
    label: "Detection-Supported Reachability",
    rawValue: maxReachableCount,
    normalizedValue: reachNorm,
    weight: reachWeight,
    contribution: reachContribution,
    explanation: reachNorm === 1.0 ? "Continuous detection-supported edge path reaches a critical target."
                 : reachNorm >= 0.5 ? `Continuous detection-supported edges allow reaching ${maxReachableCount} downstream entities.`
                 : "No continuous detection-supported edges found.",
    supportingDetectionIds: uniqueSorted(graph.edges.flatMap(e => e.detectionIds)),
    supportingEntityIds: [],
    supportingTechniqueIds: []
  };

  // Add structural limitations regarding missing path pieces
  if (graph.nodes.length > 0) {
    // If the largest connected component (source + downstream) is smaller than total graph nodes, the path is fragmented
    const maxComponentSize = maxReachableCount > 0 ? maxReachableCount + 1 : 1;
    if (maxComponentSize < graph.nodes.length) {
      if (reachesCritical) {
        limitations.push(`The graph reaches a critical target through detection-supported edges, but it does not contain a continuous detection-supported path connecting all ${graph.nodes.length} scenario entities (e.g. from initial access).`);
      } else {
        limitations.push("The graph does not contain a continuous detection-supported edge path connecting all referenced entities.");
      }
    }

    // Specifically check if a service account is a node but is not the target or source of any edges
    if (svcIds.length > 0) {
      const svcInEdges = graph.edges.some(e => svcIds.includes(e.source) || svcIds.includes(e.target));
      if (!svcInEdges) {
        limitations.push("The service account is detection-referenced as an actor but is not represented as an intermediate detection-supported movement edge.");
      }
    }
  }

  // Factor 7: Evidence breadth (Max 5)
  const evidenceTypes = new Set<string>();
  detections.forEach(d => d.evidence.forEach(e => evidenceTypes.add(e.type)));
  const breadthNorm = clamp(evidenceTypes.size / 5, 0, 1);
  const breadthWeight = 5;
  const breadthContribution = roundToTwo(breadthNorm * breadthWeight);

  const factorBreadth: PriorityScoreFactor = {
    id: "f_evidence_breadth",
    label: "Evidence Breadth",
    rawValue: evidenceTypes.size,
    normalizedValue: breadthNorm,
    weight: breadthWeight,
    contribution: breadthContribution,
    explanation: `Evidence spans ${evidenceTypes.size} distinct categories.`,
    supportingDetectionIds: uniqueSorted(detections.map(d => d.id)),
    supportingEntityIds: [],
    supportingTechniqueIds: []
  };

  const factors = [
    factorSeverity,
    factorConfidence,
    factorCredential,
    factorServiceAccount,
    factorPrivileged,
    factorReachability,
    factorBreadth
  ];

  const rawTotal = factors.reduce((sum, f) => sum + f.contribution, 0);
  const finalScore = clamp(Math.round(rawTotal), 0, 100);

  return {
    synthetic: true,
    score: finalScore,
    band: getScoreBand(finalScore),
    formulaVersion: "1.0",
    factors,
    summary: `Synthetically generated Attack Path Priority Score of ${finalScore} / 100 based on validation of ${detections.length} detections.`,
    inputs: {
      detectionCount: detections.length,
      graphNodeCount: graph.nodes.length,
      graphEdgeCount: graph.edges.length,
      reachableEntityCount: maxReachableCount,
      criticalTargetIds,
      serviceAccountIds: svcIds,
      privilegedAccessDetected: privNorm > 0,
      credentialAccessDetected: credNorm > 0
    },
    limitations: uniqueSorted(limitations)
  };
}

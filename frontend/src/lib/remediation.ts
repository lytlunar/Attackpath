import type { SyntheticDetection } from "./detectionRules";
import { deriveDetectionGraph, type DetectionGraph } from "./detectionGraph";
import { calculateAttackPathPriority, type AttackPathPriorityResult } from "./priorityScore";

export type SyntheticRemediationAction = {
  id: string;
  synthetic: true;
  label: string;
  targetEntityId: string;
  description: string;
  mitigatesRuleIds: string[];
  mitigatesTechniqueIds: string[];
};

export type SyntheticRemediationResult = {
  synthetic: true;
  action: SyntheticRemediationAction;
  before: {
    detectionIds: string[];
    graph: DetectionGraph;
    priority: AttackPathPriorityResult;
  };
  after: {
    detectionIds: string[];
    graph: DetectionGraph;
    priority: AttackPathPriorityResult;
  };
  mitigatedDetectionIds: string[];
  retainedDetectionIds: string[];
  explanation: string[];
};

const REMEDIATION_ACTIONS: Record<string, SyntheticRemediationAction> = {
  "remediation:patch-wst-02": {
    id: "remediation:patch-wst-02",
    synthetic: true,
    label: "Patch WST_02",
    targetEntityId: "WST_02",
    description: "Apply critical patch to WST_02, isolate credentials, and rotate SVC_01 password.",
    mitigatesRuleIds: ["AP-RULE-CREDENTIAL-001", "AP-RULE-LATERAL-001"],
    mitigatesTechniqueIds: ["T1003.001", "T1021"],
  },
};

export function applySyntheticRemediation(
  detections: readonly SyntheticDetection[],
  actionId: string
): SyntheticRemediationResult {
  const action = REMEDIATION_ACTIONS[actionId];
  if (!action) {
    throw new Error(`Unknown remediation action: ${actionId}`);
  }

  const beforeGraph = deriveDetectionGraph(detections);
  const beforePriority = calculateAttackPathPriority(detections, beforeGraph);

  const mitigatedDetectionIds: string[] = [];
  const retainedDetections: SyntheticDetection[] = [];

  detections.forEach((det) => {
    let mitigated = false;
    
    if (actionId === "remediation:patch-wst-02") {
      // Mitigate LSASS dumping on WST_02
      if (det.rule.id === "AP-RULE-CREDENTIAL-001" && det.entities.assetIds.includes("WST_02")) {
        mitigated = true;
      }
      // Mitigate lateral movement originating from WST_02
      if (det.rule.id === "AP-RULE-LATERAL-001" && det.graphHints?.sourceEntityId === "WST_02") {
        mitigated = true;
      }
    }

    if (mitigated) {
      mitigatedDetectionIds.push(det.id);
    } else {
      retainedDetections.push(det);
    }
  });

  const afterGraph = deriveDetectionGraph(retainedDetections);
  const afterPriority = calculateAttackPathPriority(retainedDetections, afterGraph);

  const explanation: string[] = [
    `Remediation '${action.label}' applied as a digital-model transformation.`,
  ];
  if (mitigatedDetectionIds.length > 0) {
    explanation.push(`Mitigated ${mitigatedDetectionIds.length} detections.`);
  }

  return {
    synthetic: true,
    action,
    before: {
      detectionIds: detections.map(d => d.id),
      graph: beforeGraph,
      priority: beforePriority,
    },
    after: {
      detectionIds: retainedDetections.map(d => d.id),
      graph: afterGraph,
      priority: afterPriority,
    },
    mitigatedDetectionIds,
    retainedDetectionIds: retainedDetections.map(d => d.id),
    explanation,
  };
}

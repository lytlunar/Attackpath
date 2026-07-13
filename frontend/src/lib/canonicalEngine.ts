import { evaluateDetectionRules, type SyntheticDetection } from "./detectionRules";
import type { RawSyntheticEvent } from "./rawSyntheticEvent";
import { deriveDetectionGraph, type DetectionGraph, findReachableEntityIds, findShortestDetectionPath } from "./detectionGraph";
import { AegisPathModel } from "../data/aegisPathModel";

export type CanonicalScoreFactor = {
  id: string;
  label: string;
  rawValue: number | string | boolean;
  normalizedValue: number;
  weight: number;
  contribution: number;
  evidence: string;
};

export type CanonicalBlastRadius = {
  metricName: string;
  startEntityIds: string[];
  reachableEntityIds: string[];
  totalRelevantEntityIds: string[];
  reachableCount: number;
  totalCount: number;
  percentage: number;
  traversalRule: string;
};

export type CanonicalAnalysisResult = {
  processedEvents: RawSyntheticEvent[];
  rejectedEvents: any[];
  detections: SyntheticDetection[];
  evidence: any[];
  mitreMappings: any;
  contextGraph: {
    nodes: typeof AegisPathModel.graphNodes;
    edges: typeof AegisPathModel.graphEdges;
  };
  activeGraph: DetectionGraph;
  priorityScore: {
    score: number | null;
    band: "Low" | "Medium" | "High" | "Critical" | "Not Calculated";
    factors: CanonicalScoreFactor[];
  };
  assetExposureReach: CanonicalBlastRadius | null;
  blastRadius: CanonicalBlastRadius | null;
  riskLevel: "Low" | "Medium" | "High" | "Critical" | "Not Calculated";
  pathStatus: "Awaiting Analysis" | "Active" | "Disrupted";
  primaryRemediation: { id: string; label: string };
  remediationResult: "success" | "none";
  remediationApplied: boolean;
  securityGain: number | null;
  auditEntries: any[];
  reportData: any;
  limitations: string[];
};

import { validateSyntheticEventBatch } from "./rawSyntheticEvent";

export function analyzeScenario(
  rawInput: unknown,
  options?: { applyRemediation?: boolean }
): CanonicalAnalysisResult {
  const isRemediated = !!options?.applyRemediation;

  let validationResult = { validEvents: [] as any[], rejected: [] as any[] };
  try {
    validationResult = validateSyntheticEventBatch(rawInput);
  } catch (e) {
    throw e;
  }

  let validEvents = validationResult.validEvents.map(v => v.event);

  if (isRemediated) {
    validEvents = validEvents.filter(e => e.sourceAsset?.id !== "WST_02" && e.targetAsset?.id !== "WST_02" && e.targetIdentity?.id !== "SVC_01");
  }

  const detections = evaluateDetectionRules(validEvents);
  const activeGraph = deriveDetectionGraph(detections);
  const contextGraph = {
    nodes: AegisPathModel.graphNodes,
    edges: AegisPathModel.graphEdges
  };

  let blastRadius: CanonicalBlastRadius | null = null;
  const reachableAssetIds = new Set<string>();
  const activeDetections = new Set(detections);

  if (validEvents.length > 0) {
    const validAssets = contextGraph.nodes.filter(n => n.type !== "User Identity" && n.type !== "Service Account");
    const validAssetIds = validAssets.map(n => n.id);

    // Traversable edges: ONLY active attack edges are traversed
    const traversableEdges = activeGraph.edges;

    const startEntityIds = activeGraph.nodes.some(n => n.id === "WST_02") ? ["WST_02"] : [];
    const queue = [...startEntityIds];
    startEntityIds.forEach(id => reachableAssetIds.add(id));

    while(queue.length > 0) {
      const curr = queue.shift()!;
      const outEdges = traversableEdges.filter(e => e.source === curr);
      outEdges.forEach(e => {
        if (!reachableAssetIds.has(e.target)) {
          reachableAssetIds.add(e.target);
          queue.push(e.target);
        }
      });
    }

    const finalReachable = Array.from(reachableAssetIds).filter(id => validAssetIds.includes(id)).sort();
    const percentage = validAssetIds.length > 0 ? Math.round((finalReachable.length / validAssetIds.length) * 100) : 0;

    blastRadius = {
      metricName: "Asset Exposure Reach",
      startEntityIds,
      reachableEntityIds: finalReachable,
      totalRelevantEntityIds: validAssetIds,
      reachableCount: finalReachable.length,
      totalCount: validAssetIds.length,
      percentage,
      traversalRule: "Directed traversal starting strictly from WST_02 using only detection-supported active edges."
    };

    // Filter active detections based on reachability (if they are on the active path)
    if (isRemediated) {
      activeDetections.clear();
      // If remediated, any downstream detections not reachable from WST_02 are mitigated
      for (const d of detections) {
        const involvesReachable = d.entities.assetIds.some(id => reachableAssetIds.has(id)) || d.entities.actorIds.some(id => reachableAssetIds.has(id));
        if (involvesReachable) {
          activeDetections.add(d);
        }
      }
    }
  }

  let scoreObj = {
    score: null as number | null,
    band: "Not Calculated" as "Low" | "Medium" | "High" | "Critical" | "Not Calculated",
    factors: [] as CanonicalScoreFactor[]
  };

  if (validEvents.length > 0) {
    // 1. Vulnerability Severity
    const hasWST02 = activeGraph.nodes.some(n => n.id === "WST_02");
    const vulnSeverity = hasWST02 && !isRemediated ? 1.0 : 0.0;

    // 2. Exploit Likelihood
    const exploitLikelihood = hasWST02 && !isRemediated ? 0.95 : 0.0;

    // 3. Target Asset Criticality
    const assetCriticality = 1.0;

    // 4. Privilege Exposure
    let privNorm = 0.0;
    let privEvidence = "No privilege escalation detected";
    // Check ACTIVE detections for privilege level
    const activeDetsArr = Array.from(activeDetections);
    if (activeDetsArr.some(d => d.rule.id === "AP-RULE-DIRECTORY-001")) {
      privNorm = 1.0;
      privEvidence = "Domain privilege access detected (DCSync)";
    } else if (activeDetsArr.some(d => d.rule.id === "AP-RULE-LATERAL-001")) {
      privNorm = 0.75;
      privEvidence = "Service account lateral movement detected";
    } else if (activeDetsArr.some(d => d.rule.id === "AP-RULE-CREDENTIAL-001")) {
      privNorm = 0.5;
      privEvidence = "Local credential exposure detected";
    } else if (activeDetsArr.some(d => d.rule.id === "AP-RULE-IDENTITY-001")) {
      privNorm = 0.25;
      privEvidence = "Standard identity active exposure";
    }

    // 5. Critical Path Reachability
    const hasFullRoute = findShortestDetectionPath(activeGraph, "USR_03", "DC_01") !== null;
    const reachability = hasFullRoute ? 1.0 : 0.0;

    // 6. Detection Confidence
    let detectionConfidence = 0.0;
    let confEvidence = "No active detections";
    if (activeDetsArr.length > 0) {
      // Use the explicit confidenceScore field from SyntheticDetection
      const confidences = activeDetsArr.map(d => (d as any).confidenceScore || 0.5);
      detectionConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      confEvidence = `Averaged across ${activeDetsArr.length} active detections`;
    }

    const fVuln = { id: "vulnerabilitySeverity", label: "Vulnerability Severity", rawValue: vulnSeverity > 0, normalizedValue: vulnSeverity, weight: 25, contribution: vulnSeverity * 25, evidence: "active WST_02 vulnerability", sourceType: "dynamic", sourceIds: ["WST_02"], explanation: "Severity of active vulnerabilities on compromised endpoints." };
    const fExploit = { id: "exploitLikelihood", label: "Exploit Likelihood", rawValue: exploitLikelihood, normalizedValue: exploitLikelihood, weight: 15, contribution: exploitLikelihood * 15, evidence: "WST_02 EPSS demo input", sourceType: "dynamic", sourceIds: ["WST_02"], explanation: "Likelihood of exploit based on threat intelligence." };
    const fAsset = { id: "targetAssetCriticality", label: "Target Asset Criticality", rawValue: "Critical", normalizedValue: assetCriticality, weight: 20, contribution: assetCriticality * 20, evidence: "DC_01 inherent criticality", sourceType: "static", sourceIds: ["DC_01"], explanation: "DC_01 remains a business-critical target even when the active route is disrupted." };
    const fPriv = { id: "privilegeExposure", label: "Privilege Exposure", rawValue: privNorm, normalizedValue: privNorm, weight: 15, contribution: privNorm * 15, evidence: privEvidence, sourceType: "dynamic", sourceIds: activeDetsArr.map(d=>d.id), explanation: "Current active privilege exposure derived from retained evidence." };
    const fReach = { id: "criticalPathReachability", label: "Critical Path Reachability", rawValue: reachability > 0, normalizedValue: reachability, weight: 15, contribution: reachability * 15, evidence: hasFullRoute ? "USR_03 to DC_01 path is active" : "Path is severed", sourceType: "dynamic", sourceIds: activeGraph.edges.map(e=>e.id), explanation: "Checks if a continuous attack path exists to the critical target." };
    const fConf = { id: "detectionConfidence", label: "Detection Confidence", rawValue: detectionConfidence, normalizedValue: detectionConfidence, weight: 10, contribution: detectionConfidence * 10, evidence: confEvidence, sourceType: "dynamic", sourceIds: activeDetsArr.map(d=>d.id), explanation: "Aggregated confidence of the active supporting detections." };

    const factors = [fVuln, fExploit, fAsset, fPriv, fReach, fConf];
    const rawTotal = factors.reduce((sum, f) => sum + f.contribution, 0);
    const score = Math.round(rawTotal);

    let band: "Low" | "Medium" | "High" | "Critical" = "Low";
    if (score >= 75) band = "Critical";
    else if (score >= 50) band = "High";
    else if (score >= 25) band = "Medium";

    scoreObj = { score, band, factors };
  }

  let pathStatus: "Awaiting Analysis" | "Active" | "Disrupted" = "Awaiting Analysis";
  if (validEvents.length === 0) pathStatus = "Awaiting Analysis";
  else if (isRemediated) pathStatus = "Disrupted";
  else pathStatus = "Active";

  let securityGain = null;
  // Dynamic recalculation instead of literal tracking
  if (isRemediated && scoreObj.score !== null) {
    // Determine what beforeScore would be by forcing isRemediated = false in calculation
    const beforeDets = evaluateDetectionRules(validationResult.validEvents.map(v => v.event));
    const beforeConfs = beforeDets.map(d => (d as any).confidenceScore || 0.5);
    const beforeConf = beforeConfs.reduce((a, b) => a + b, 0) / beforeConfs.length;
    const beforePriv = beforeDets.some(d => d.rule.id === "AP-RULE-DIRECTORY-001") ? 1.0 : (beforeDets.some(d => d.rule.id === "AP-RULE-LATERAL-001") ? 0.75 : 0.5);
    const beforeReach = findShortestDetectionPath(deriveDetectionGraph(beforeDets), "USR_03", "DC_01") !== null ? 1.0 : 0.0;

    const beforeScore = Math.round(25 + 15*0.95 + 20 + 15*beforePriv + 15*beforeReach + 10*beforeConf);
    securityGain = beforeScore - scoreObj.score;
  }

  return {
    processedEvents: validEvents,
    rejectedEvents: validationResult.rejected,
    detections,
    evidence: detections.flatMap(d => d.evidence),
    mitreMappings: AegisPathModel.mitreMappings,
    contextGraph,
    activeGraph,
    priorityScore: scoreObj,
    assetExposureReach: blastRadius, // UI alias compatibility
    blastRadius,
    riskLevel: scoreObj.band,
    pathStatus,
    remediationApplied: isRemediated,
    primaryRemediation: { id: "remediation:patch-wst-02", label: "Patch WST_02" },
    remediationResult: isRemediated ? "success" : "none",
    securityGain,
    auditEntries: [
      { id: "au1", timestamp: new Date().toISOString(), action: "scenario_analyzed", status: "success", detail: "Canonical engine processed scenario batch." }
    ],
    reportData: {
      historicalPrivilegedActivity: isRemediated // if remediated, it had historic privilege
    },
    limitations: ["The remediation is applied to the digital attack model, not to a production endpoint."]
  };
}

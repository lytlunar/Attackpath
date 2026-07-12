import { AegisPathModel } from "../data/aegisPathModel";
import type { SyntheticDetection } from "./detectionRules";

export type DetectionGraphNode = {
  id: string;
  label: string;
  entityType: string;
  synthetic: true;
  assetId?: string;
  actorId?: string;
  severity: "low" | "medium" | "high" | "critical";
  detectionIds: string[];
  sourceEventIds: string[];
  mitreTechniqueIds: string[];
  state: "observed" | "targeted" | "compromised" | "credential-exposed" | "lateral-movement" | "privileged-access";
  criticality?: "low" | "medium" | "high" | "critical";
};

export type DetectionGraphEdge = {
  id: string;
  synthetic: true;
  source: string;
  target: string;
  relationship: string;
  detectionIds: string[];
  sourceEventIds: string[];
  mitreTechniqueIds: string[];
  severity: "low" | "medium" | "high" | "critical";
  origin: "detection";
};

export type DetectionGraph = {
  synthetic: true;
  nodes: DetectionGraphNode[];
  edges: DetectionGraphEdge[];
  unresolvedEntities: {
    entityId: string;
    detectionIds: string[];
    reason: string;
  }[];
  metadata: {
    detectionCount: number;
    nodeCount: number;
    edgeCount: number;
  };
};

const SEVERITY_LEVELS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4
};

const STATE_PRECEDENCE: Record<string, number> = {
  "observed": 1,
  "targeted": 2,
  "compromised": 3,
  "credential-exposed": 4,
  "lateral-movement": 5,
  "privileged-access": 6
};

function getMaxSeverity(a: string, b: string): "low" | "medium" | "high" | "critical" {
  return SEVERITY_LEVELS[a] > SEVERITY_LEVELS[b] ? (a as any) : (b as any);
}

function getMaxState(a: string, b: string): DetectionGraphNode["state"] {
  return STATE_PRECEDENCE[a] > STATE_PRECEDENCE[b] ? (a as any) : (b as any);
}

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr)).sort();
}

export function deriveDetectionGraph(detections: readonly SyntheticDetection[]): DetectionGraph {
  const nodesMap = new Map<string, DetectionGraphNode>();
  const edgesMap = new Map<string, DetectionGraphEdge>();
  const unresolved: DetectionGraph["unresolvedEntities"] = [];

  const getOrCreateNode = (entityId: string): DetectionGraphNode | null => {
    if (nodesMap.has(entityId)) return nodesMap.get(entityId)!;

    const baselineNode = AegisPathModel.graphNodes.find(n => n.id === entityId);
    if (!baselineNode) {
      return null;
    }

    const node: DetectionGraphNode = {
      id: entityId,
      label: baselineNode.label,
      entityType: baselineNode.type,
      synthetic: true,
      assetId: baselineNode.type !== "User Identity" && baselineNode.type !== "Service Account" ? entityId : undefined,
      actorId: baselineNode.type === "User Identity" || baselineNode.type === "Service Account" ? entityId : undefined,
      severity: "low",
      detectionIds: [],
      sourceEventIds: [],
      mitreTechniqueIds: [],
      state: "observed",
      criticality: baselineNode.status === "critical_target" ? "critical" : undefined
    };
    nodesMap.set(entityId, node);
    return node;
  };

  const addEntityRef = (entityId: string, det: SyntheticDetection, defaultState: DetectionGraphNode["state"]) => {
    const node = getOrCreateNode(entityId);
    if (!node) {
      // Only record unresolved if not already recorded for this detection
      const existing = unresolved.find(u => u.entityId === entityId);
      if (existing) {
        if (!existing.detectionIds.includes(det.id)) existing.detectionIds.push(det.id);
      } else {
        unresolved.push({ entityId, detectionIds: [det.id], reason: "Unknown baseline entity" });
      }
      return;
    }
    node.detectionIds.push(det.id);
    node.sourceEventIds.push(...det.sourceEventIds);
    node.mitreTechniqueIds.push(...det.mitre.techniques.map(t => t.id));
    node.severity = getMaxSeverity(node.severity, det.severity);
    node.state = getMaxState(node.state, defaultState);
  };

  for (const det of detections) {
    // 1. Universally ensure all referenced entities are added to the graph as nodes
    det.entities.actorIds.forEach(id => {
      // For the service account in lateral movement or directory access, the account itself is 'compromised'
      let actorState: DetectionGraphNode["state"] = "observed";
      if (det.rule.id === "AP-RULE-IDENTITY-001") actorState = "compromised";
      if (det.rule.id === "AP-RULE-LATERAL-001") actorState = "compromised";
      if (det.rule.id === "AP-RULE-DIRECTORY-001") actorState = "compromised";
      addEntityRef(id, det, actorState);
    });

    det.entities.assetIds.forEach(id => {
      let assetState: DetectionGraphNode["state"] = "observed";
      if (det.rule.id === "AP-RULE-CREDENTIAL-001") assetState = "credential-exposed";
      addEntityRef(id, det, assetState);
    });

    // 2. Process specific graph hints for relationships and specific state overrides
    const sourceId = det.graphHints?.sourceEntityId;
    const targetId = det.graphHints?.targetEntityId;

    if (det.rule.id === "AP-RULE-LATERAL-001") {
      if (sourceId) addEntityRef(sourceId, det, "compromised");
      if (targetId) addEntityRef(targetId, det, "lateral-movement");
    } else if (det.rule.id === "AP-RULE-DIRECTORY-001") {
      if (sourceId) addEntityRef(sourceId, det, "compromised");
      if (targetId) addEntityRef(targetId, det, "privileged-access");
    }

    // 3. Create edges if trustworthy source and target hints exist
    if (sourceId && targetId && nodesMap.has(sourceId) && nodesMap.has(targetId)) {
      const relationship = det.graphHints?.relationship || "connected";
      const edgeId = `edge:${sourceId}:${relationship}:${targetId}`;
      if (!edgesMap.has(edgeId)) {
        edgesMap.set(edgeId, {
          id: edgeId,
          synthetic: true,
          source: sourceId,
          target: targetId,
          relationship: relationship,
          detectionIds: [],
          sourceEventIds: [],
          mitreTechniqueIds: [],
          severity: "low",
          origin: "detection"
        });
      }
      const edge = edgesMap.get(edgeId)!;
      if (!edge.detectionIds.includes(det.id)) edge.detectionIds.push(det.id);
      edge.sourceEventIds.push(...det.sourceEventIds);
      edge.mitreTechniqueIds.push(...det.mitre.techniques.map(t => t.id));
      edge.severity = getMaxSeverity(edge.severity, det.severity);
    }
  }

  // Deduplicate and sort arrays
  for (const node of nodesMap.values()) {
    node.detectionIds = uniqueSorted(node.detectionIds);
    node.sourceEventIds = uniqueSorted(node.sourceEventIds);
    node.mitreTechniqueIds = uniqueSorted(node.mitreTechniqueIds);
  }
  for (const edge of edgesMap.values()) {
    edge.detectionIds = uniqueSorted(edge.detectionIds);
    edge.sourceEventIds = uniqueSorted(edge.sourceEventIds);
    edge.mitreTechniqueIds = uniqueSorted(edge.mitreTechniqueIds);
  }

  // Ensure deterministic output ordering
  const sortedNodes = Array.from(nodesMap.values()).sort((a, b) => a.id.localeCompare(b.id));
  const sortedEdges = Array.from(edgesMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  return {
    synthetic: true,
    nodes: sortedNodes,
    edges: sortedEdges,
    unresolvedEntities: unresolved.sort((a, b) => a.entityId.localeCompare(b.entityId)),
    metadata: {
      detectionCount: detections.length,
      nodeCount: sortedNodes.length,
      edgeCount: sortedEdges.length
    }
  };
}

export function findReachableEntityIds(graph: DetectionGraph, startEntityId: string): string[] {
  const reachable = new Set<string>();
  const queue = [startEntityId];
  
  if (!graph.nodes.some(n => n.id === startEntityId)) return [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (reachable.has(current)) continue;
    reachable.add(current);

    const outEdges = graph.edges.filter(e => e.source === current);
    outEdges.sort((a, b) => a.target.localeCompare(b.target));
    for (const edge of outEdges) {
      if (!reachable.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  reachable.delete(startEntityId);
  return Array.from(reachable).sort();
}

export function findShortestDetectionPath(graph: DetectionGraph, sourceId: string, targetId: string): string[] | null {
  if (!graph.nodes.some(n => n.id === sourceId) || !graph.nodes.some(n => n.id === targetId)) {
    return null;
  }
  if (sourceId === targetId) return [sourceId];

  const queue: string[][] = [[sourceId]];
  const visited = new Set<string>([sourceId]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    if (current === targetId) return path;

    const outEdges = graph.edges.filter(e => e.source === current);
    outEdges.sort((a, b) => a.target.localeCompare(b.target));

    for (const edge of outEdges) {
      if (!visited.has(edge.target)) {
        visited.add(edge.target);
        queue.push([...path, edge.target]);
      }
    }
  }

  return null;
}

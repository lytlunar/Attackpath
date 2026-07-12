// frontend/src/lib/types.ts

// ── Input Types ──────────────────────────────────────────────────────────────

export interface SecurityEvent {
  id: string; // "evt_001"
  timestamp: string; // ISO 8601
  source: string; // Sensor/feed name
  nodeId: string; // Target asset ID
  severity: "Critical" | "High" | "Medium" | "Low";
  message: string; // Narrative detection text
  techniqueId: string; // ATT&CK ID(s) e.g. "T1003.001"
  sourceNodeId?: string; // Explicit edge source entity
  targetNodeId?: string; // Explicit edge target entity
  edgeId?: string; // Explicit canonical edge ID
}

// ── MITRE / Detection Types ───────────────────────────────────────────────────

export type DetectionType = "InitialAccess" | "CredentialAccess" | "LateralMovement";

export type PrivilegeLevel = "user" | "service" | "localAdmin" | "domainAdmin";

export type EvidenceType = "direct" | "correlated" | "scenario";

export interface Detection {
  detectionId: string;
  eventId: string;
  nodeId: string;
  detectionType: DetectionType;
  technique: string;
  techniqueName: string;
  confidence: "High" | "Medium" | "Low";
  privilegeLevelGained: PrivilegeLevel;
  status: "Open" | "Investigating" | "Contained";
}

export interface EdgeEvidence {
  edgeId: string;
  evidenceType: EvidenceType;
  sourceEventId?: string;
  description: string;
}

export interface EvidencedAccessEdge {
  edgeId: string;
  source: string;
  target: string;
  basis: string;
  evidenceType: EvidenceType;
}

// ── Asset Types ───────────────────────────────────────────────────────────────

export interface Asset {
  id: string;
  criticality: "critical" | "high" | "medium" | "low";
  status: "secure" | "at_risk" | "compromised" | "exploited" | "vulnerable" | "monitoring";
  role: "critical" | "context";
}

// ── API Analysis State (server-calculated, no presentation metadata) ──────────

export interface GraphNodeAnalysisState {
  id: string;
  role: "critical" | "context";
  status: Asset["status"];
  onCriticalPath: boolean;
  reachableViaActivePath: boolean;
  severed: boolean;
}

export interface GraphEdgeAnalysisState {
  id: string;
  source: string;
  target: string;
  role: "critical" | "chokepoint" | "context";
  severed: boolean;
  isChokepoint: boolean;
  evidence?: EdgeEvidence;
}

// ── Score and Metrics ─────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  total: number;
  factorPrivilege: number;
  factorPathCompleteness: number;
  factorBlastRadius: number;
  label: "Critical" | "High" | "Medium" | "Low";
}

export interface BlastRadiusResult {
  percentage: number;
  reachableAssetIds: string[];
  totalMonitoredAssets: number;
  reachableCount: number;
}

// ── Remediation Types ─────────────────────────────────────────────────────────

export interface RemediationAction {
  id: string;
  label: string;
  description: string;
  targetNodeId: string;
  targetEdgeId?: string;
}

export interface RemediationMetricSnapshot {
  riskScore: number;
  riskLevel: string;
  blastRadius: number;
  pathStatus: string;
}

export interface RemediationPreview {
  bundleId: string;
  before: RemediationMetricSnapshot;
  after: RemediationMetricSnapshot;
  projectedScoreReduction: number;
  projectedScore: ScoreBreakdown;
  projectedBlastRadius: BlastRadiusResult;
  securityGain: number;
  severedEdgeId: string;
  isolatedNodeIds: string[];
  pathStatusAfter: "Active" | "Disrupted";
}

// ── Audit Types ───────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  ipAddress: string;
  result: "Success" | "Warning" | "Failure";
  dynamic: boolean;
}

// ── Replay Domain Contracts (server-derived output) ───────────────────────────

export type ReplayStep = 0 | 1 | 2 | 3 | 4;
export type ReplayStatus = "Not Started" | "In Progress" | "Completed" | "Remediated";

export interface ReplayState {
  currentStep: ReplayStep;
  totalSteps: number;
  status: ReplayStatus;
}

// ── Incident Report ────────────────────────────────────────────────────────────

export interface IncidentReport {
  generatedAt: string;
  pathStatus: "Active" | "Disrupted";
  criticalPath: string[];
  chokepointEdgeId: string;
  score: ScoreBreakdown;
  blastRadius: BlastRadiusResult;
  activePathCoverage: number;
  evidenceCoverage: number;
  timeline: Array<{ timestamp: string; event: string; nodeId: string }>;
  iocs: Array<{ type: string; value: string; confidence: string }>;
  remediationApplied: boolean;
  remediationTimestamp: string | null;
}

// ── Core Scenario State ───────────────────────────────────────────────────────

export interface ScenarioState {
  remediationApplied: boolean;
  remediationTimestamp: string | null;
  criticalPath: string[];
  chokepointEdge: GraphEdgeAnalysisState;
  pathStatus: "Active" | "Disrupted";
  nodes: GraphNodeAnalysisState[];
  edges: GraphEdgeAnalysisState[];
  score: ScoreBreakdown;
  blastRadius: BlastRadiusResult;
  securityGain: number;
  primaryFix: RemediationAction;
  remediationBundle: RemediationAction[];
  evidenceCoverage: number;
  activePathCoverage: number;

  // Replay fields
  replay: ReplayState;
  activeEvents: SecurityEvent[];
  activeDetections: Detection[];
  incidentReport: IncidentReport;
}

// ── API Response Wrapper Types ────────────────────────────────────────────────

export interface RemediationApplyResponse {
  state: ScenarioState;
  auditEntry: AuditEntry;
}

export interface ScenarioResetResponse {
  state: ScenarioState;
  auditEntry: AuditEntry;
}

// ── Request Types (stateless API) ────────────────────────────────────────────

export interface RemediationApplyRequest {
  bundleId: string;
  appliedBy?: string;
}

export interface RemediationPreviewRequest {
  bundleId: string;
}

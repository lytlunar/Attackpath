import type { RawSyntheticEvent } from "./rawSyntheticEvent";

export type DetectionEvidence = {
  type: "identity" | "process" | "authentication" | "network" | "directory" | "asset" | "field";
  label: string;
  value: string | number | boolean;
  sourceEventId: string;
  fieldPath: string;
};

export type SyntheticDetection = {
  id: string;
  synthetic: true;
  rule: {
    id: string;
    name: string;
    version: string;
  };
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: "low" | "medium" | "high";
  detectedAt: string;
  sourceEventIds: string[];
  entities: {
    actorIds: string[];
    assetIds: string[];
  };
  mitre: {
    tactic: {
      id?: string;
      name: string;
    };
    techniques: {
      id: string;
      name: string;
      subTechnique?: boolean;
    }[];
  };
  evidence: DetectionEvidence[];
  graphHints?: {
    sourceEntityId?: string;
    targetEntityId?: string;
    relationship?: string;
  };
};

export type DetectionRule = {
  id: string;
  name: string;
  version: string;
  evaluate: (events: readonly RawSyntheticEvent[]) => SyntheticDetection[];
};

// MITRE Taxonomy mappings based on existing project conventions
export const MITRE_TECHNIQUES = {
  VALID_ACCOUNTS: { id: "T1078", name: "Valid Accounts" },
  LSASS_MEMORY: { id: "T1003.001", name: "OS Credential Dumping: LSASS Memory", subTechnique: true },
  DCSYNC: { id: "T1003.006", name: "OS Credential Dumping: DCSync", subTechnique: true },
  REMOTE_SERVICES: { id: "T1021", name: "Remote Services" }
};

// Rule 1: Suspicious Identity Access
const suspiciousIdentityRule: DetectionRule = {
  id: "AP-RULE-IDENTITY-001",
  name: "Suspicious Identity Access Bypassing MFA",
  version: "1.0",
  evaluate: (events) => {
    const detections: SyntheticDetection[] = [];
    for (const evt of events) {
      if (
        evt.source.category === "identity" &&
        evt.outcome === "success" &&
        evt.actor?.accountType === "human" &&
        evt.authentication?.mfaUsed === false &&
        evt.network?.sourceIp
      ) {
        const detId = `det:${suspiciousIdentityRule.id}:${evt.id}`;
        detections.push({
          id: detId,
          synthetic: true,
          rule: { id: suspiciousIdentityRule.id, name: suspiciousIdentityRule.name, version: suspiciousIdentityRule.version },
          title: "Suspicious Identity Access Bypassing MFA",
          description: "A human user successfully authenticated from an anomalous IP address without MFA.",
          severity: "high",
          confidence: "medium",
          detectedAt: evt.timestamp,
          sourceEventIds: [evt.id],
          entities: {
            actorIds: evt.actor.userId ? [evt.actor.userId] : [],
            assetIds: []
          },
          mitre: {
            tactic: { name: "Initial Access" },
            techniques: [MITRE_TECHNIQUES.VALID_ACCOUNTS]
          },
          evidence: [
            { type: "identity", label: "Actor User ID", value: evt.actor.userId || "Unknown", sourceEventId: evt.id, fieldPath: "actor.userId" },
            { type: "network", label: "Source IP", value: evt.network.sourceIp, sourceEventId: evt.id, fieldPath: "network.sourceIp" },
            { type: "authentication", label: "MFA Used", value: false, sourceEventId: evt.id, fieldPath: "authentication.mfaUsed" }
          ]
        });
      }
    }
    return detections;
  }
};

// Rule 2: LSASS Credential Access
const lsassCredentialAccessRule: DetectionRule = {
  id: "AP-RULE-CREDENTIAL-001",
  name: "LSASS Credential Access via MiniDump",
  version: "1.0",
  evaluate: (events) => {
    const detections: SyntheticDetection[] = [];
    for (const evt of events) {
      if (
        evt.source.category === "endpoint" &&
        evt.process?.targetProcess?.toLowerCase() === "lsass.exe" &&
        (evt.process.commandLine?.toLowerCase().includes("minidump") || evt.process.commandLine?.toLowerCase().includes("comsvcs.dll"))
      ) {
        const detId = `det:${lsassCredentialAccessRule.id}:${evt.id}`;
        detections.push({
          id: detId,
          synthetic: true,
          rule: { id: lsassCredentialAccessRule.id, name: lsassCredentialAccessRule.name, version: lsassCredentialAccessRule.version },
          title: "LSASS Memory Dump Detected",
          description: "A process attempted to access and dump LSASS memory, potentially extracting credentials.",
          severity: "critical",
          confidence: "high",
          detectedAt: evt.timestamp,
          sourceEventIds: [evt.id],
          entities: {
            actorIds: [],
            assetIds: evt.sourceAsset?.id ? [evt.sourceAsset.id] : []
          },
          mitre: {
            tactic: { name: "Credential Access" },
            techniques: [MITRE_TECHNIQUES.LSASS_MEMORY]
          },
          evidence: [
            { type: "process", label: "Target Process", value: evt.process.targetProcess, sourceEventId: evt.id, fieldPath: "process.targetProcess" },
            { type: "process", label: "Command Line", value: evt.process.commandLine || "Unknown", sourceEventId: evt.id, fieldPath: "process.commandLine" },
            { type: "asset", label: "Source Asset", value: evt.sourceAsset?.id || "Unknown", sourceEventId: evt.id, fieldPath: "sourceAsset.id" }
          ]
        });
      }
    }
    return detections;
  }
};

// Rule 3: Service-Account Lateral Movement
const lateralMovementRule: DetectionRule = {
  id: "AP-RULE-LATERAL-001",
  name: "Service-Account Lateral Movement",
  version: "1.0",
  evaluate: (events) => {
    const detections: SyntheticDetection[] = [];
    for (const evt of events) {
      if (
        evt.actor?.accountType === "service" &&
        evt.sourceAsset?.id &&
        evt.targetAsset?.id &&
        evt.sourceAsset.id !== evt.targetAsset.id &&
        evt.outcome === "success" &&
        (evt.authentication?.logonType === "Network" || evt.authentication?.protocol === "Kerberos")
      ) {
        const detId = `det:${lateralMovementRule.id}:${evt.id}`;
        detections.push({
          id: detId,
          synthetic: true,
          rule: { id: lateralMovementRule.id, name: lateralMovementRule.name, version: lateralMovementRule.version },
          title: "Lateral Movement via Service Account",
          description: "Successful network authentication from one asset to another using a service account.",
          severity: "high",
          confidence: "medium",
          detectedAt: evt.timestamp,
          sourceEventIds: [evt.id],
          entities: {
            actorIds: evt.actor.userId ? [evt.actor.userId] : [],
            assetIds: [evt.sourceAsset.id, evt.targetAsset.id]
          },
          mitre: {
            tactic: { name: "Lateral Movement" },
            techniques: [MITRE_TECHNIQUES.REMOTE_SERVICES]
          },
          evidence: [
            { type: "identity", label: "Service Account", value: evt.actor.userId || "Unknown", sourceEventId: evt.id, fieldPath: "actor.userId" },
            { type: "asset", label: "Source Asset", value: evt.sourceAsset.id, sourceEventId: evt.id, fieldPath: "sourceAsset.id" },
            { type: "asset", label: "Target Asset", value: evt.targetAsset.id, sourceEventId: evt.id, fieldPath: "targetAsset.id" },
            { type: "authentication", label: "Logon Type", value: evt.authentication?.logonType || "Unknown", sourceEventId: evt.id, fieldPath: "authentication.logonType" }
          ],
          graphHints: {
            sourceEntityId: evt.sourceAsset.id,
            targetEntityId: evt.targetAsset.id,
            relationship: "service-account-lateral-movement"
          }
        });
      }
    }
    return detections;
  }
};

// Rule 4: Privileged Domain-Controller Access
const privilegedDcAccessRule: DetectionRule = {
  id: "AP-RULE-DIRECTORY-001",
  name: "Privileged Domain-Controller Directory Replication",
  version: "1.0",
  evaluate: (events) => {
    const detections: SyntheticDetection[] = [];
    for (const evt of events) {
      if (
        (evt.targetAsset?.id === "DC_01" || evt.targetAsset?.criticality === "critical") &&
        evt.actor?.privileged === true &&
        evt.directory?.operation?.toLowerCase().includes("drsuapi")
      ) {
        const detId = `det:${privilegedDcAccessRule.id}:${evt.id}`;
        detections.push({
          id: detId,
          synthetic: true,
          rule: { id: privilegedDcAccessRule.id, name: privilegedDcAccessRule.name, version: privilegedDcAccessRule.version },
          title: "Privileged DC Access (Possible DCSync)",
          description: "A privileged account initiated directory replication operations against a domain controller.",
          severity: "critical",
          confidence: "high",
          detectedAt: evt.timestamp,
          sourceEventIds: [evt.id],
          entities: {
            actorIds: evt.actor.userId ? [evt.actor.userId] : [],
            assetIds: evt.targetAsset?.id ? [evt.targetAsset.id] : []
          },
          mitre: {
            tactic: { name: "Credential Access" },
            techniques: [MITRE_TECHNIQUES.DCSYNC]
          },
          evidence: [
            { type: "identity", label: "Actor Privileged", value: true, sourceEventId: evt.id, fieldPath: "actor.privileged" },
            { type: "asset", label: "Target Asset", value: evt.targetAsset?.id || "Unknown", sourceEventId: evt.id, fieldPath: "targetAsset.id" },
            { type: "directory", label: "Operation", value: evt.directory.operation, sourceEventId: evt.id, fieldPath: "directory.operation" }
          ],
          graphHints: {
            sourceEntityId: evt.sourceAsset?.id || evt.network?.sourceIp,
            targetEntityId: evt.targetAsset?.id,
            relationship: "privileged-directory-access"
          }
        });
      }
    }
    return detections;
  }
};

const ALL_RULES = [
  suspiciousIdentityRule,
  lsassCredentialAccessRule,
  lateralMovementRule,
  privilegedDcAccessRule
];

export function evaluateDetectionRules(events: readonly RawSyntheticEvent[]): SyntheticDetection[] {
  const allDetections: SyntheticDetection[] = [];
  
  // Deterministic rule evaluation
  for (const rule of ALL_RULES) {
    const ruleDets = rule.evaluate(events);
    allDetections.push(...ruleDets);
  }

  // Deduplicate identical detections based on ID
  const deduplicated: SyntheticDetection[] = [];
  const seenIds = new Set<string>();

  for (const det of allDetections) {
    if (!seenIds.has(det.id)) {
      seenIds.add(det.id);
      deduplicated.push(det);
    }
  }

  return deduplicated;
}

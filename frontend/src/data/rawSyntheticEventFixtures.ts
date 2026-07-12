import type { RawSyntheticEvent } from "../lib/rawSyntheticEvent";

export const rawSyntheticEventFixtures: RawSyntheticEvent[] = [
  // 1. Suspicious identity access
  {
    id: "evt_raw_001",
    schemaVersion: "1.0",
    synthetic: true,
    timestamp: "2026-07-05T08:58:40Z",
    source: {
      category: "identity",
      product: "Cloud Identity Protection",
    },
    eventType: "Cloud Authentication",
    outcome: "success",
    severity: "high",
    actor: {
      userId: "USR_03",
      accountType: "human",
    },
    authentication: {
      protocol: "OIDC",
      logonType: "Interactive",
      mfaUsed: false,
    },
    network: {
      sourceIp: "192.168.1.100", // Anomalous IP
    },
    metadata: {
      description: "Anomalous successful cloud authentication bypassing expected MFA.",
    },
  },

  // 2. LSASS credential access
  {
    id: "evt_raw_002",
    schemaVersion: "1.0",
    synthetic: true,
    timestamp: "2026-07-05T11:00:03Z",
    source: {
      category: "endpoint",
      product: "Endpoint Agent",
    },
    eventType: "Process Access",
    outcome: "success",
    severity: "critical",
    sourceAsset: {
      id: "WST_02",
      assetType: "Workstation",
    },
    process: {
      name: "rundll32.exe",
      commandLine: "rundll32.exe C:\\windows\\system32\\comsvcs.dll, MiniDump 712 C:\\temp\\lsass.dmp full",
      targetProcess: "lsass.exe",
    },
    metadata: {
      description: "Suspicious credential access via comsvcs.dll MiniDump against LSASS memory.",
    },
  },

  // 3. Service-account lateral movement
  {
    id: "evt_raw_003",
    schemaVersion: "1.0",
    synthetic: true,
    timestamp: "2026-07-05T13:29:03Z",
    source: {
      category: "network",
      product: "SIEM Kerberos Correlation",
    },
    eventType: "Network Authentication",
    outcome: "success",
    severity: "high",
    actor: {
      userId: "SVC_01",
      accountType: "service",
    },
    sourceAsset: {
      id: "WST_02",
      assetType: "Workstation",
    },
    targetAsset: {
      id: "SRV_01",
      assetType: "Server",
    },
    authentication: {
      protocol: "Kerberos",
      logonType: "Network",
    },
    metadata: {
      description: "Lateral movement using compromised service account credentials.",
    },
  },

  // 4. Privileged domain-controller access
  {
    id: "evt_raw_004",
    schemaVersion: "1.0",
    synthetic: true,
    timestamp: "2026-07-05T14:14:33Z",
    source: {
      category: "directory",
      product: "Domain Controller AD Audit",
    },
    eventType: "Directory Service Access",
    outcome: "success",
    severity: "critical",
    actor: {
      userId: "SVC_01", // Or an impersonated user
      privileged: true,
    },
    sourceAsset: {
      id: "SRV_01",
      assetType: "Server",
    },
    targetAsset: {
      id: "DC_01",
      assetType: "Domain Controller",
      criticality: "critical",
    },
    directory: {
      operation: "DRSUAPI GetNCChanges",
      objectType: "domainDNS",
    },
    metadata: {
      description: "Privileged directory replication activity indicating possible DCSync.",
    },
  },
];

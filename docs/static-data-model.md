# AegisPath — Static Data Model
**Status: Approved. All 6 pages read from this single data object.**

---

## Overview

A single global JavaScript object (`AegisPathModel`) acts as the shared data source for the entire application. No backend. No database. All pages read from and write their state back to this object.

The simulation state (whether the remediation bundle has been applied) is stored as a boolean flag on this object and persists across page navigation.

---

## Full Data Model

```javascript
const AegisPathModel = {

  // ─── SIMULATION STATE ───────────────────────────────────────────────────────
  // This flag is toggled by the Risk Simulation page.
  // All other pages read this to determine which state to render.
  remediationApplied: false,

  // ─── NODES ──────────────────────────────────────────────────────────────────
  nodes: [
    {
      id: "USR_03",
      label: "USR_03",
      type: "user",
      status: "compromised",
      description: "Compromised domain user credentials used as the attacker entry point."
    },
    {
      id: "WST_02",
      label: "WST_02",
      type: "endpoint",
      status: "compromised",
      description: "Standard domain workstation with a local privilege escalation weakness. Primary chokepoint.",
      isChokepoint: true
    },
    {
      id: "SVC_01",
      label: "SVC_01",
      type: "service",
      status: "compromised",
      description: "High-privilege service account with credentials cached in LSASS memory on WST_02."
    },
    {
      id: "SRV_01",
      label: "SRV_01",
      type: "server",
      status: "compromised",
      description: "Application server with cached domain administrator credentials."
    },
    {
      id: "DC_01",
      label: "DC_01",
      type: "domain_controller",
      status: "compromised",
      description: "Active Directory Domain Controller. Identity boundary and crown jewels asset."
    }
  ],

  // ─── EDGES ──────────────────────────────────────────────────────────────────
  edges: [
    {
      source: "USR_03",
      target: "WST_02",
      type: "network",
      status: "active",
      isChokepoint: false
    },
    {
      source: "WST_02",
      target: "SVC_01",
      type: "credential_harvest",
      status: "active",
      isChokepoint: true   // This edge is severed when remediation is applied
    },
    {
      source: "SVC_01",
      target: "SRV_01",
      type: "lateral_movement",
      status: "active",
      isChokepoint: false
    },
    {
      source: "SRV_01",
      target: "DC_01",
      type: "domain_escalation",
      status: "active",
      isChokepoint: false
    }
  ],

  // ─── THREAT EVENTS ──────────────────────────────────────────────────────────
  // Static, curated SOC telemetry. Explains why the path exists.
  // Displayed on the Threat Events page.
  threatEvents: [
    {
      id: "evt_001",
      timestamp: "2026-07-05T04:12:00Z",
      source: "Active Directory",
      severity: "High",
      node: "USR_03",
      message: "Multiple failed login attempts followed by successful logon for USR_03 from an unrecognized IP."
    },
    {
      id: "evt_002",
      timestamp: "2026-07-05T04:15:22Z",
      source: "WST_02 Endpoint Agent",
      severity: "Critical",
      node: "WST_02",
      message: "Suspicious memory access targeting LSASS.exe detected from an unprivileged process."
    },
    {
      id: "evt_003",
      timestamp: "2026-07-05T04:18:10Z",
      source: "Network Firewall",
      severity: "High",
      node: "SVC_01",
      message: "Unusual RPC connection from WST_02 to SRV_01 authenticated with service account SVC_01."
    },
    {
      id: "evt_004",
      timestamp: "2026-07-05T04:22:45Z",
      source: "Domain Controller AD Audit",
      severity: "Critical",
      node: "DC_01",
      message: "Kerberos Ticket-Granting Ticket (TGT) request for a Domain Administrator account originating from SRV_01."
    }
  ],

  // ─── MITRE ATT&CK MAPPINGS ──────────────────────────────────────────────────
  // Keyed by step identifier. Displayed as badges on graph nodes and Threat Events.
  mitreMappings: {
    USR_03: {
      technique: "T1078",
      name: "Valid Accounts",
      description: "Attacker obtains and abuses valid domain user credentials to establish initial access."
    },
    WST_02_ingress: {
      technique: "T1021",
      name: "Remote Services",
      description: "Lateral movement onto WST_02 using legitimate remote access protocols with compromised credentials."
    },
    WST_02_escalation: {
      technique: "T1068",
      name: "Exploitation for Privilege Escalation",
      description: "Attacker exploits a local privilege escalation weakness on WST_02 to reach SYSTEM-level access."
    },
    WST_02_dumping: {
      technique: "T1003.001",
      name: "OS Credential Dumping: LSASS Memory",
      description: "SYSTEM-level access enables extraction of cached service account credentials from LSASS memory."
    },
    SVC_01_abuse: {
      technique: "T1078 / T1021",
      name: "Valid Accounts & Remote Services",
      description: "Compromised SVC_01 credentials used to authenticate into SRV_01 via remote services."
    },
    DC_01_escalation: {
      technique: "T1078 / T1021",
      name: "Valid Accounts & Remote Services",
      description: "Cached domain administrator credentials used to pivot from SRV_01 to DC_01."
    }
  },

  // ─── REMEDIATION BUNDLE ─────────────────────────────────────────────────────
  // Applied to chokepoint node WST_02 via the Risk Simulation page.
  remediationBundle: {
    target: "WST_02",
    actions: [
      {
        id: "rem_lpe",
        label: "Patch Local Privilege Escalation",
        status: "pending",
        description: "Install security updates addressing the local privilege escalation weakness on WST_02."
      },
      {
        id: "rem_cred",
        label: "Implement Credential Protection",
        status: "pending",
        description: "Apply Credential Guard-style memory hardening to reduce credential exposure in memory and make credential dumping less useful."
      },
      {
        id: "rem_rotate",
        label: "Rotate SVC_01 Credentials",
        status: "pending",
        description: "Change the SVC_01 service account password and invalidate all active Kerberos TGTs."
      }
    ]
  },

  // ─── METRICS ────────────────────────────────────────────────────────────────
  metricsBefore: {
    riskScore: 500,
    blastRadius: 85,
    riskLevel: "Critical",
    pathStatus: "Active",
    securityGain: 0
  },

  metricsAfter: {
    riskScore: 120,
    blastRadius: 30,
    riskLevel: "Medium",
    pathStatus: "Disrupted",
    securityGain: 380
  },

  // ─── AUDIT EVENTS ───────────────────────────────────────────────────────────
  // Pre-seeded log entries. When remediation is applied via Risk Simulation,
  // a new entry is appended dynamically by the simulation engine.
  auditEvents: [
    {
      id: "aud_001",
      timestamp: "2026-07-05T05:00:00Z",
      user: "SecOps Admin",
      action: "Attack Path Detection Initialized",
      details: "Analyzed 152 Active Directory relationships. Isolated 1 critical active lateral movement path."
    },
    {
      id: "aud_002",
      timestamp: "2026-07-05T05:05:00Z",
      user: "SecOps Admin",
      action: "Remediation Simulation Started",
      details: "Initiated what-if modeling for remediation bundle targeting chokepoint node WST_02."
    }
  ]

};
```

---

## Notes

- `remediationApplied` is the master state flag. All pages check this flag to decide which data to render.
- The `isChokepoint: true` on the `WST_02 → SVC_01` edge signals the graph renderer to visually sever this link when the flag is set.
- `auditEvents` starts with 2 pre-seeded entries. The Risk Simulation page appends a third entry dynamically when the bundle is applied.
- No backend, no API calls, no localStorage required unless deemed necessary during implementation.

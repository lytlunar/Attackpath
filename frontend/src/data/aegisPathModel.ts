export const AegisPathModel = {
  threatEvents: [
    {
      id: "evt_001",
      timestamp: "2026-07-05T08:58:40Z",
      source: "Cloud Identity Protection",
      severity: "High",
      node: "USR_03",
      message: "Anomalous successful cloud authentication was detected for USR_03 from an external infrastructure pattern consistent with Adversary-in-the-Middle session token replay. The sign-in bypassed normal MFA expectations and triggered an identity-risk alert for possible valid account abuse."
    },
    {
      id: "evt_002",
      timestamp: "2026-07-05T11:00:03Z",
      source: "WST_02 Endpoint Agent",
      severity: "Critical",
      node: "WST_02",
      message: "Suspicious credential access activity was detected on chokepoint workstation WST_02. Endpoint telemetry identified an elevated process invoking comsvcs.dll MiniDump behavior against LSASS memory and writing a dump artifact to a temporary directory."
    },
    {
      id: "evt_003",
      timestamp: "2026-07-05T13:29:03Z",
      source: "SIEM Kerberos Correlation",
      severity: "High",
      node: "SVC_01",
      message: "Unusual Kerberos service ticket activity was observed for service-linked accounts, followed by authenticated SMB/RPC movement toward SRV_01 using compromised service credentials. The lateral movement pattern is consistent with service account abuse after offline ticket cracking."
    },
    {
      id: "evt_004",
      timestamp: "2026-07-05T14:14:33Z",
      source: "Domain Controller AD Audit",
      severity: "Critical",
      node: "DC_01",
      message: "Privileged directory replication activity was detected on DC_01 from the downstream attack path through SRV_01. The event indicates possible DCSync behavior through DRSUAPI GetNCChanges and exposure of high-value domain credential material."
    }
  ],

  mitreMappings: {
    USR_03: {
      technique: "T1078.004 / T1539",
      name: "Valid Accounts: Cloud Accounts / Steal Web Session Information",
      description: "Attacker replays a stolen cloud session token for USR_03 to bypass normal MFA expectations and establish valid account access."
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
      description: "Endpoint telemetry on WST_02 indicates LSASS memory dumping via comsvcs.dll MiniDump behavior, exposing cached credential material."
    },
    SVC_01_abuse: {
      technique: "T1558.003 / T1021.002",
      name: "Kerberoasting / Remote Services: SMB Windows Admin Shares",
      description: "Kerberos service ticket abuse leads to compromised service credentials being used for SMB/RPC movement toward SRV_01."
    },
    DC_01_escalation: {
      technique: "T1003.006",
      name: "OS Credential Dumping: DCSync",
      description: "Privileged directory replication activity on DC_01 indicates DCSync behavior through DRSUAPI GetNCChanges and exposure of high-value domain credential material."
    }
  },

  criticalPath: ["USR_03", "WST_02", "SVC_01", "SRV_01", "DC_01"],
  chokepointEdge: { source: "WST_02", target: "SVC_01" },

  graphNodes: [
    // Level 0 - Target
    {
      id: "DC_01", label: "DC_01", type: "Domain Controller", status: "critical_target",
      description: "Crown jewel. Full domain compromise if reached. Protect via tiered admin model. Target of Golden Ticket and DCSync attacks.",
      role: "critical", x: 520, y: 70, iconType: "Building2"
    },

    // Level 1 - Servers / Data assets
    {
      id: "SRV_01", label: "SRV_01", type: "Application Server", status: "at_risk",
      description: "Application server used as lateral movement pivot. SMB admin share exposure. Contains cached domain admin credentials.",
      role: "critical", x: 520, y: 185, iconType: "Server"
    },
    {
      id: "SRV_02", label: "SRV_02", type: "Application Server", status: "secure",
      description: "DMZ web server. Patched, monitored, and not part of the active attack path.",
      role: "context", x: 320, y: 185, iconType: "Server"
    },
    {
      id: "DB_01", label: "DB_01", type: "Database", status: "at_risk",
      description: "Database containing sensitive backup records. At risk because SRV_01 is reachable through the active attack path.",
      role: "context", x: 720, y: 185, iconType: "Database"
    },

    // Level 2 - Services / Monitoring
    {
      id: "SVC_01", label: "SVC_01", type: "Service Account", status: "exploited",
      description: "High-privilege service account (SPN present). Kerberoastable. Credentials cached in LSASS on WST_02.",
      role: "critical", x: 500, y: 315, iconType: "Cog"
    },
    {
      id: "SIEM_01", label: "SIEM_01", type: "Security Tool", status: "monitoring",
      description: "SOCSimulator-inspired monitoring source used to generate demo SOC logs, MITRE-mapped events, and curated attack path signals.",
      role: "context", x: 280, y: 315, iconType: "Radar"
    },
    {
      id: "SVC_02", label: "SVC_02", type: "Service Account", status: "secure",
      description: "Service account used for monitoring and reporting tasks. No suspicious privilege abuse detected.",
      role: "context", x: 720, y: 315, iconType: "Cog"
    },

    // Level 3 - Workstations
    {
      id: "WST_02", label: "WST_02", type: "Workstation", status: "vulnerable",
      description: "Primary chokepoint. Unpatched CVE-2024-XXXX allows local privilege escalation. LSASS dump observed. Remediating here severs the entire downstream attack path.",
      role: "critical", x: 520, y: 440, iconType: "Monitor"
    },
    {
      id: "WST_01", label: "WST_01", type: "Workstation", status: "secure",
      description: "Endpoint protected by EDR. Clean state.",
      role: "context", x: 320, y: 440, iconType: "Monitor"
    },
    {
      id: "WST_03", label: "WST_03", type: "Workstation", status: "secure",
      description: "Isolated admin workstation with restricted access. No suspicious activity detected.",
      role: "context", x: 720, y: 440, iconType: "Monitor"
    },

    // Level 4 - Users / Endpoints
    {
      id: "USR_03", label: "USR_03", type: "User Identity", status: "compromised",
      description: "Compromised via phishing initial access. This user account is the attack origin.",
      role: "critical", x: 560, y: 555, iconType: "User"
    },
    {
      id: "USR_01", label: "USR_01", type: "User Identity", status: "secure",
      description: "Standard user session. No anomalies detected.",
      role: "context", x: 220, y: 555, iconType: "User"
    },
    {
      id: "USR_02", label: "USR_02", type: "User Identity", status: "secure",
      description: "Standard user session. No anomalies detected.",
      role: "context", x: 370, y: 555, iconType: "User"
    },
    {
      id: "USR_04", label: "USR_04", type: "User Identity", status: "secure",
      description: "Standard user session. No anomalies detected.",
      role: "context", x: 760, y: 555, iconType: "User"
    }
  ],

  graphEdges: [
    // CRITICAL EDGES (Upward attack path through layers)
    { id: "e1", source: "USR_03", target: "WST_02", role: "critical", description: "Compromised user accesses vulnerable workstation." },
    { id: "e2", source: "WST_02", target: "SVC_01", role: "chokepoint", description: "Exposed credentials on WST_02 allow access to SVC_01." },
    { id: "e3", source: "SVC_01", target: "SRV_01", role: "critical", description: "Exploited service account enables lateral movement to SRV_01." },
    { id: "e4", source: "SRV_01", target: "DC_01", role: "critical", description: "Compromised server creates a path toward the domain controller." },

    // CONTEXT EDGES (Relationships within and between layers)
    { id: "e5", source: "WST_01", target: "USR_01", role: "context", description: "Normal user workstation session." },
    { id: "e6", source: "WST_01", target: "USR_02", role: "context", description: "Normal user workstation session." },
    { id: "e7", source: "WST_03", target: "USR_04", role: "context", description: "Secure admin workstation session." },
    { id: "e8", source: "WST_02", target: "WST_01", role: "context", description: "Local network interactions between workstations." },
    { id: "e9", source: "WST_02", target: "WST_03", role: "context", description: "Local network interactions between workstations." },
    { id: "e10", source: "SVC_01", target: "SIEM_01", role: "context", description: "Security tooling monitors service account behavior." },
    { id: "e11", source: "SVC_01", target: "SVC_02", role: "context", description: "Service interactions between SVC_01 and SVC_02." },
    { id: "e12", source: "SVC_01", target: "SRV_02", role: "context", description: "Service account has privileges on web server." },
    { id: "e13", source: "SRV_01", target: "DB_01", role: "context", description: "SRV_01 has access to sensitive backup database." }
  ]
};

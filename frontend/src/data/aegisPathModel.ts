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
  }
};

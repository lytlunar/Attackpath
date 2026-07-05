# AegisPath — Page Architecture
**Status: Approved. 6 clickable pages. Persistent sidebar navigation.**

---

## Navigation Structure

All 6 pages share a persistent sidebar. The sidebar labels pages as Core or Support to guide the user through the demo flow naturally.

```
┌─────────────────┬────────────────────────────────────────────┐
│   SIDEBAR NAV   │                  PAGE CONTENT              │
│                 │                                            │
│  [CORE]         │                                            │
│  • Overview     │     ← active page renders here             │
│  • Attack Graph │                                            │
│  • Simulation   │                                            │
│                 │                                            │
│  [SUPPORT]      │                                            │
│  • Threat Events│                                            │
│  • Intel Brief  │                                            │
│  • Audit Trail  │                                            │
│                 │                                            │
└─────────────────┴────────────────────────────────────────────┘
```

---

## Core Pages

### 1. Overview
**Route / Nav Label:** Overview  
**Classification:** Core  
**Owner Module:** Module 1 (UI Skeleton + Attack Graph)

**Purpose:**  
The entry point. Shows the current global security posture at a glance. Establishes the severity of the threat before the analyst digs deeper.

**What it renders:**
- Global risk score (500 pre-remediation, 120 post)
- Blast radius indicator (85% / 30%)
- Risk level badge (Critical / Medium)
- Path status (Active / Disrupted)
- Summary of the active threat path: USR_03 → DC_01
- Alert banner: "1 Critical Active Lateral Movement Path Detected"

**Reads from:** `metricsBefore` / `metricsAfter` depending on `remediationApplied` flag.  
**Does not include:** Graph rendering, simulation controls, or log tables.

---

### 2. Attack Graph
**Route / Nav Label:** Attack Graph  
**Classification:** Core  
**Owner Module:** Module 1 (UI Skeleton + Attack Graph)

**Purpose:**  
The technical visualization of the compromise path. Shows the 5-node chain with MITRE ATT&CK technique badges on each edge. Analysts can click nodes to see details.

**What it renders:**
- SVG-based 5-node path: USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01
- Edge type labels (credential_harvest, lateral_movement, domain_escalation)
- MITRE technique badges on each edge
- Clickable nodes showing: node type, description, relevant MITRE technique
- When remediation is applied: WST_02 → SVC_01 edge is visually severed; downstream nodes (SVC_01, SRV_01, DC_01) are visually muted

**Reads from:** `nodes`, `edges`, `mitreMappings`, `remediationApplied`.  
**Does not include:** Simulation controls or metric cards (those belong to the Simulation page).

---

### 3. Risk Simulation
**Route / Nav Label:** Risk Simulation  
**Classification:** Core  
**Owner Module:** Module 3 (Risk + What-if Simulation)

**Purpose:**  
The interactive sandbox. The analyst applies the remediation bundle and observes the live impact on metrics and the attack graph. This is the demo centrepiece.

**What it renders:**
- Remediation bundle panel for WST_02:
  - Checkbox: Patch Local Privilege Escalation
  - Checkbox: Implement Credential Protection
  - Checkbox: Rotate SVC_01 Credentials
- "Apply Bundle" / "Reset" action button
- Before/after metric comparison cards (Risk Score, Blast Radius, Risk Level, Path Status, Security Gain)
- A compact embedded graph showing the path (reads the same state as the Attack Graph page)
- Security Gain counter animation on apply

**Reads from:** `remediationBundle`, `metricsBefore`, `metricsAfter`, `remediationApplied`.  
**Writes to:** `remediationApplied` flag (triggers state change across the whole app).  
**Also triggers:** New entry appended to `auditEvents`.

---

## Support Pages

### 4. Threat Events
**Route / Nav Label:** Threat Events  
**Classification:** Support  
**Owner Module:** Module 2 (SOC Logs + MITRE Timeline)

**Purpose:**  
The evidence base. Shows the curated SOC telemetry that explains why the attack path exists. Adds credibility to the simulation by showing it is grounded in real-world detection patterns.

**What it renders:**
- Chronological event table: timestamp, source, severity, associated node, message
- Severity badges (Critical / High / Medium)
- Node association labels linking each event back to the attack path
- MITRE technique reference for each event row

**Reads from:** `threatEvents`, `mitreMappings`.  
**Does not include:** Simulation controls or metric cards.

---

### 5. Intelligence Brief
**Route / Nav Label:** Intelligence Brief  
**Classification:** Support  
**Owner Module:** Module 4 (AI Agent + Playbook + Audit)

**Purpose:**  
A CISO-facing, print-optimised summary. Translates the technical findings and simulation results into a business-language ROI document. Demonstrates the product has executive-level value, not just analyst-level utility.

**What it renders:**
- Executive summary: threat description, asset at risk (DC_01), path summary
- Remediation recommendation: the 3-step bundle on WST_02
- Before/after metric table
- Risk reduction narrative (Security Gain of 380)
- Classification/confidentiality header (e.g. "CONFIDENTIAL — INTERNAL USE ONLY")
- Print-friendly layout (CSS `@media print` optimised)

**Reads from:** `metricsBefore`, `metricsAfter`, `remediationBundle`, `remediationApplied`.  
**Does not include:** Interactive controls or live graph.

---

### 6. Audit Trail
**Route / Nav Label:** Audit Trail  
**Classification:** Support  
**Owner Module:** Module 4 (AI Agent + Playbook + Audit)

**Purpose:**  
A tamper-evident compliance log. Shows administrators and auditors what actions were taken in the system, including when the simulation was run and the bundle was applied. Reinforces the enterprise compliance angle.

**What it renders:**
- Chronological audit log table: timestamp, user, action, details
- Pre-seeded entries (system initialization, simulation started)
- Dynamic entry appended when remediation bundle is applied via Risk Simulation page
- Visual distinction between pre-seeded and dynamically added entries

**Reads from:** `auditEvents`.  
**Updated by:** Risk Simulation page when `remediationApplied` is set to true.

---

## Summary Table

| Page | Classification | Module Owner | Reads | Writes |
| :--- | :--- | :--- | :--- | :--- |
| Overview | Core | Module 1 | metrics, remediationApplied | — |
| Attack Graph | Core | Module 1 | nodes, edges, mitreMappings, remediationApplied | — |
| Risk Simulation | Core | Module 3 | remediationBundle, metrics, remediationApplied | remediationApplied, auditEvents |
| Threat Events | Support | Module 2 | threatEvents, mitreMappings | — |
| Intelligence Brief | Support | Module 4 | metrics, remediationBundle, remediationApplied | — |
| Audit Trail | Support | Module 4 | auditEvents | — |

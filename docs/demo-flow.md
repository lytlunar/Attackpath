# AegisPath — Demo Flow
**Status: Approved. 3-minute judge-facing presentation script.**

---

## Objective

Walk judges from the problem (a live lateral movement path) to the solution (a targeted remediation bundle) to the business value (risk reduction and compliance logging) — in exactly 3 minutes.

The demo must feel like a live enterprise security response, not a slide deck or a feature tour.

---

## Pre-Demo Setup

Before judges arrive:
- App is open on the **Overview** page
- `remediationApplied` is set to `false` (pre-remediation state)
- Risk Score displays **500**, Blast Radius **85%**, Risk Level **Critical**, Path Status **Active**
- The alert banner is visible: "1 Critical Active Lateral Movement Path Detected"

---

## Demo Script

### 0:00 – 0:35 | Overview — Establish the Threat

**What is on screen:** Overview page, Critical risk state.

**Talking points:**
- "AegisPath is an attack path analysis and remediation simulation platform."
- "Right now we are looking at an active lateral movement path that has been detected in our enterprise environment."
- "Risk Score is 500. Blast Radius is 85%. This path reaches the Domain Controller — the identity boundary of the entire organisation."
- "This is not a theoretical risk. Let me show you how the attacker got here."

**Action:** Click **Attack Graph** in the sidebar.

---

### 0:35 – 1:15 | Attack Graph — Show the Anatomy

**What is on screen:** Attack Graph page, 5-node active path, all edges live.

**Talking points:**
- "The attacker starts with a compromised user account — USR_03. That is T1078, Valid Accounts."
- "From there, they move laterally onto Workstation WST_02. T1021, Remote Services."
- "On WST_02, they exploit a local privilege escalation weakness to reach SYSTEM level — T1068."
- "With SYSTEM access, they dump LSASS memory and extract the cached credentials of SVC_01, a high-privilege service account. T1003.001."
- "They use SVC_01 to pivot to the application server, and from there reach the Domain Controller."
- *(Click on WST_02 node to show the detail panel)* "WST_02 is the chokepoint. This is where we intervene."

**Action:** Click **Risk Simulation** in the sidebar.

---

### 1:15 – 2:15 | Risk Simulation — Apply the Remediation

**What is on screen:** Risk Simulation page, bundle panel, pre-remediation metrics.

**Talking points:**
- "This is not a single patch. The remediation here is a structured bundle applied to WST_02."
- *(Point to the 3 checklist items)* "We patch the local privilege escalation weakness. We implement credential protection to reduce exposure in memory and make credential dumping less useful. And we rotate and invalidate the SVC_01 service account credentials."
- "Let me apply the bundle now."

**Action:** Check all 3 items. Click **Apply Bundle**.

**What happens:**
- The WST_02 → SVC_01 edge is visually severed in the embedded graph
- Downstream nodes (SVC_01, SRV_01, DC_01) are visually muted
- Risk Score animates down: **500 → 120**
- Blast Radius animates down: **85% → 30%**
- Risk Level updates: **Critical → Medium**
- Path Status updates: **Active → Disrupted**
- Security Gain displays: **+380**

**Talking points (after apply):**
- "The path is disrupted. By hardening a single workstation, the attacker can no longer reach the Domain Controller via this vector."
- "Security Gain is 380. Risk has dropped from Critical to Medium."
- *(Optional)* "You can see this is also supported by the detection events on the Threat Events page — real SOC telemetry that triggered this investigation."

**Action:** Click **Intelligence Brief** in the sidebar.

---

### 2:15 – 2:45 | Intelligence Brief — Show the Business Value

**What is on screen:** Intelligence Brief page, executive report layout.

**Talking points:**
- "This is the output a CISO needs — not a raw log, not a terminal dump."
- "It shows the threat, the remediation recommendation, and the simulated risk reduction in language a board can understand."
- "Risk Score from 500 to 120. Blast Radius from 85% to 30%. Security Gain of 380."
- "This page is print-optimised. You can hand this directly to a board or include it in an incident response report."

**Action:** Click **Audit Trail** in the sidebar.

---

### 2:45 – 3:00 | Audit Trail — Close on Compliance

**What is on screen:** Audit Trail page, chronological log including the newly appended entry.

**Talking points:**
- "Every action taken in AegisPath is logged here as a compliance-grade audit entry."
- "The system initialised the path analysis. The analyst began the simulation. And the remediation bundle was applied — all timestamped and attributed."
- "AegisPath does not just help you respond to threats. It creates an audit-ready record of what was done, when, and by whom."

**End of demo.**

---

## Timing Summary

| Segment | Page | Duration |
| :--- | :--- | :--- |
| Establish the Threat | Overview | 0:35 |
| Show the Anatomy | Attack Graph | 0:40 |
| Apply the Remediation | Risk Simulation | 1:00 |
| Show the Business Value | Intelligence Brief | 0:30 |
| Close on Compliance | Audit Trail | 0:15 |
| **Total** | | **3:00** |

---

## Notes for Presenters

- Do not spend time explaining the sidebar or navigation. Move through it naturally.
- If judges ask about Threat Events during the demo, briefly mention it during the Simulation segment: "This is backed by real SOC detection events — you can see those on the Threat Events page."
- If a judge asks about AI: the Intelligence Brief includes a simulated AI playbook section. Do not oversell the AI angle — focus on the remediation logic and the risk reduction story.
- If something breaks: stay on whichever page is working. The metrics on Overview and Intelligence Brief tell the full story without the interactive graph.

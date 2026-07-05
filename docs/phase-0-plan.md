# AegisPath — Phase 0 Plan
**Status: Approved. This is the source of truth for the project.**

---

## 1. Real Product Goal

Enterprise SOCs are flooded with disconnected vulnerability alerts. They lack a cohesive tool to trace how attackers chain these vulnerabilities to compromise high-value assets such as Active Directory Domain Controllers.

**AegisPath** maps attack vectors, allows analysts to visualize the threat chain, understand active exploits via MITRE ATT&CK mappings, and simulate the deployment of structured remediation bundles to disrupt lateral movement.

---

## 2. Hackathon MVP Scope

The MVP represents a single critical compromise path:

- Interactive 6-page shell with persistent sidebar navigation
- 5-node attack graph visualizer with a clear chokepoint
- Remediation simulation panel applying a multi-step bundle
- Metrics recalculation engine reflecting state transitions

**Key metric transitions when remediation is applied:**

| Metric | Before | After |
| :--- | :--- | :--- |
| Risk Score | 500 | 120 |
| Blast Radius | 85% | 30% |
| Risk Level | Critical | Medium |
| Path Status | Active | Disrupted |
| Security Gain | 0 | 380 |

---

## 3. Visual & Aesthetic Constraints

The final visual design direction is **not decided yet.** It will be chosen after reviewing references and creating a dedicated design prompt.

Current constraints:
- Must feel like a serious enterprise cybersecurity / SOC platform
- Must not look like a game, a chatbot, or a generic AI dashboard
- No neon, cyberpunk, glassmorphic, glowing lines, or gaming-style effects
- Prioritize structured layouts, clear typography, and strict informational hierarchy

---

## 4. Scope Creep — What NOT to Build

| Item | Reason |
| :--- | :--- |
| Real-time network scanners | All data is simulated |
| Dynamic graph generation from logs | Out of scope for MVP |
| User authentication | Not needed for demo |
| Production patching integration | No real deployment scripts |
| PDF file export | Print-friendly CSS page is sufficient |

---

## 5. Core User Story

> **As an** Enterprise Security Administrator,  
> **I want to** analyze the active lateral movement path targeting the Domain Controller,  
> **So that I can** simulate the security ROI of a remediation bundle at the workstation chokepoint, verify that it disrupts the path, and review the audit trail and intelligence brief for C-level presentation.

---

## 6. Cybersecurity Story — MITRE ATT&CK Mapping

**Core attack path:**

```
USR_03 → WST_02 → SVC_01 → SRV_01 → DC_01
```

| Step | Node | Technique | Name |
| :--- | :--- | :--- | :--- |
| 1 | USR_03 | T1078 | Valid Accounts |
| 2 | WST_02 (ingress) | T1021 | Remote Services |
| 3 | WST_02 (escalation) | T1068 | Exploitation for Privilege Escalation |
| 4 | WST_02 → SVC_01 | T1003.001 | OS Credential Dumping: LSASS Memory |
| 5 | SVC_01 → SRV_01 | T1078 / T1021 | Valid Accounts & Remote Services |
| 6 | SRV_01 → DC_01 | T1078 / T1021 | Valid Accounts & Remote Services |

**Narrative:**
1. Attacker compromises domain user credentials (USR_03) — T1078
2. Logs into workstation WST_02 via network service — T1021
3. Exploits local privilege escalation weakness on WST_02 to reach SYSTEM — T1068
4. Dumps LSASS memory to harvest cached SVC_01 service account credentials — T1003.001
5. Abuses SVC_01 credentials to access SRV_01 — T1078 / T1021
6. Pivots from SRV_01 to DC_01 using cached domain admin credentials — T1078 / T1021

---

## 7. Remediation Bundle — WST_02

The remediation is not a single patch. It is a structured bundle applied to the chokepoint node WST_02:

1. **Patch Local Privilege Escalation** — Install security updates addressing the local privilege escalation weakness.
2. **Implement Credential Protection** — Configure Credential Guard-style memory hardening to reduce credential exposure in memory and make credential dumping less useful.
3. **Rotate SVC_01 Credentials** — Change the service account password and invalidate active Kerberos TGTs.

**Result:** The WST_02 → SVC_01 link is severed. All downstream nodes (SRV_01, DC_01) are no longer reachable via this path.

---

## 8. Project Risks

| Risk | Mitigation |
| :--- | :--- |
| State lost when navigating between pages | Use a global JS state object (AegisPathModel) read by all pages |
| Graph nodes overlap or layout breaks | Use hardcoded coordinates, not auto-layout |
| Support pages feel like filler | Keep them purposeful — Threat Events as evidence, Audit Trail as compliance |
| Scope expands mid-hackathon | Refer back to this document and reject additions that are not in MVP scope |

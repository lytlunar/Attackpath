# AegisPath — Team Division
**Status: Approved. Module-based ownership. Each person owns a product module end-to-end.**

---

## Ownership Model

Each team member owns a product module. Ownership means full responsibility for that module's:
- Frontend (HTML structure, CSS, JS logic for their pages)
- Data (their slice of the `AegisPathModel` static data object)
- Documentation (their module's notes and data rationale)

This is not a role-based model (no separate Designer, Developer, QA roles). Each person delivers a complete, working module.

---

## Module 1 — UI Skeleton + Attack Graph

**Pages owned:** Overview, Attack Graph  
**Data owned:** `nodes`, `edges`

### Main Responsibility
Build the overall application shell, persistent sidebar navigation, global layout grid, and the interactive SVG-based attack graph.

### Frontend Deliverables
- Persistent sidebar navigation with Core / Support section labels
- Global layout grid used by all 6 pages
- SVG rendering of the 5-node attack path
- Node click events showing detail panels (description, MITRE technique)
- Edge state change: visually severs WST_02 → SVC_01 when `remediationApplied` is true
- Overview page metric cards and alert banner
- CSS design token system (shared with all other modules)

### Data Deliverables
- `nodes` array (all 5 node objects)
- `edges` array (all 4 edge objects including `isChokepoint` flag)

### Must NOT Do
- Implement risk score calculation logic (Module 3)
- Write the Threat Events table (Module 2)
- Write the Intelligence Brief or Audit Trail (Module 4)

### Interaction Points
- **With Module 3**: Expose a hook or event that the simulation page calls to toggle edge and node visual states when `remediationApplied` changes
- **With Module 2**: Accept MITRE badge data to overlay on graph edges

### Key Demo Output
A clean, professional SOC layout with a working 5-node attack graph that visually responds to the remediation state.

---

## Module 2 — SOC Logs + MITRE Timeline

**Pages owned:** Threat Events  
**Data owned:** `threatEvents`, `mitreMappings`

### Main Responsibility
Design and populate the Threat Events page with credible, curated SOC telemetry. Map each event to the correct MITRE ATT&CK technique. Provide MITRE badge data consumed by Module 1's graph.

### Frontend Deliverables
- Threat Events page: chronological event table
- Severity badges (Critical / High / Medium)
- Node association column linking events to path nodes
- MITRE technique reference column per event row

### Data Deliverables
- `threatEvents` array (all 4 static SOC events)
- `mitreMappings` object (all 6 technique mappings)

### Must NOT Do
- Write global layout CSS or sidebar navigation (Module 1)
- Implement remediation toggles or metric transitions (Module 3)
- Write audit logs or intelligence brief content (Module 4)

### Interaction Points
- **With Module 1**: Provide `mitreMappings` data for MITRE badges on graph edges and nodes
- **With Module 4**: Provide `threatEvents` data for context in the AI playbook recommendations

### Key Demo Output
A Threat Events page that reads like authentic enterprise SOC telemetry with clear MITRE ATT&CK context, establishing the technical credibility of the attack path.

---

## Module 3 — Risk + What-if Simulation

**Pages owned:** Risk Simulation  
**Data owned:** `remediationBundle`, `metricsBefore`, `metricsAfter`, `remediationApplied` flag

### Main Responsibility
Build the simulation workbench. The analyst applies the remediation bundle and sees live metric changes and graph state updates. This is the product's primary interactive moment.

### Frontend Deliverables
- Risk Simulation page layout
- Remediation bundle checklist panel (3 action items for WST_02)
- "Apply Bundle" and "Reset" action buttons
- Before/after metric comparison cards (Risk Score, Blast Radius, Risk Level, Path Status, Security Gain)
- Animated counter transitions when metrics change
- Compact embedded graph view (reads same state as Module 1's graph)

### Data Deliverables
- `remediationBundle` object (target node and 3 actions)
- `metricsBefore` object
- `metricsAfter` object
- `remediationApplied` boolean flag (the master state switch)

### Must NOT Do
- Render the full SVG attack graph from scratch (use Module 1's graph component)
- Write MITRE timeline content (Module 2)
- Write the Intelligence Brief or Audit Trail (Module 4)

### Interaction Points
- **With Module 1**: Trigger the `remediationApplied` state change, which Module 1's graph reads to update visual state
- **With Module 4**: When bundle is applied, append a new entry to `auditEvents`

### Key Demo Output
A live what-if workbench where pressing "Apply Bundle" visibly breaks the attack path, drops the risk score from 500 to 120, and changes the path status to Disrupted.

---

## Module 4 — AI Agent + Playbook + Audit

**Pages owned:** Intelligence Brief, Audit Trail  
**Data owned:** `auditEvents`, static playbook recommendations

### Main Responsibility
Produce the CISO-facing executive report and the compliance audit log. Position AegisPath as a product suitable for enterprise governance, not just analyst tooling.

### Frontend Deliverables
- Intelligence Brief page: print-optimised executive summary layout
- Metric before/after table in the brief
- Simulated AI playbook section: contextual recommendations referencing the active path
- Audit Trail page: chronological compliance log table
- Dynamic audit entry appended when Module 3 applies the bundle

### Data Deliverables
- `auditEvents` array (pre-seeded entries + dynamic append logic)
- Static playbook recommendation text (referencing nodes, MITRE techniques, and remediation steps)

### Must NOT Do
- Configure sidebar navigation or global layout (Module 1)
- Implement metric calculations or simulation toggles (Module 3)
- Write or manage SOC telemetry data (Module 2)

### Interaction Points
- **With Module 3**: Listen for the `remediationApplied` state change; append new `auditEvent` entry when it fires
- **With Module 2**: Reference `threatEvents` data to support playbook recommendation context

### Key Demo Output
A professional, print-ready Intelligence Brief that a CISO could hand to a board — and an Audit Trail that shows the simulation was logged as a formal compliance event.

---

## Cross-Module Coordination Points

| Handoff | From | To | What |
| :--- | :--- | :--- | :--- |
| MITRE badge data | Module 2 | Module 1 | `mitreMappings` object for graph edge overlays |
| Graph state hook | Module 1 | Module 3 | Function/event to toggle edge and node visual state |
| remediationApplied event | Module 3 | Module 1 | Signal to update graph visuals |
| remediationApplied event | Module 3 | Module 4 | Signal to append audit log entry |
| Threat context | Module 2 | Module 4 | `threatEvents` for playbook recommendation text |

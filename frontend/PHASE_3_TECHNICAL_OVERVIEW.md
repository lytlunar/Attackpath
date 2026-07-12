# AegisPath Phase 3 Technical Overview

## Synthetic Detection Pipeline and Remediation Workflow

AegisPath Phase 3 introduces a stateless, pure-function backend powered by Nitro API endpoints, and a separated frontend React UI for processing "Synthetic Security Incidents." This phase transitions the project from a hardcoded replay demo (Phase 2) to a dynamically validated, detection-driven analytical simulation.

### Architecture

The Phase 3 pipeline follows a strict unidirectional data flow:

1. **Raw synthetic events** (`POST /api/scenario/ingest`): The system receives raw synthetic JSON logs representing security incidents.
2. **Zod validation** (`src/lib/rawSyntheticEvent.ts`): The logs are rigidly validated against predefined schemas. Invalid formats are rejected immediately with granular error indexes and messages.
3. **Detection rules** (`src/lib/detectionRules.ts`): Validated events are evaluated through heuristic rule mapping. Events that match specific patterns (e.g., LSASS credential access, DCSync) trigger discrete `AegisPathDetection` objects.
4. **MITRE mapping**: Each detection correlates explicitly with MITRE ATT&CK framework vectors (e.g., T1078, T1003.001) for standardized threat contextualization.
5. **Detection graph** (`src/lib/detectionGraph.ts`): Detection rules output source/target relationships and entity IDs. The graph builder algorithm maps these back against the `AegisPathModel` baseline to dynamically derive an active attack graph topology comprising `nodes` and `edges`.
6. **Priority score** (`src/lib/priorityScore.ts`): An objective, non-probabilistic scoring engine evaluates the current graph state. The canonical formula factors `Severity (25)`, `Confidence (10)`, `Credential exposure (15)`, `Service account (10)`, `Privileged access (20)`, `Reachability (15)`, and `Evidence breadth (5)` to generate a maximum score of 100.
7. **Digital-model remediation** (`src/lib/remediation.ts`): The user can inject simulated remediation actions (e.g., `remediation:patch-wst-02`). This acts as an immutable function map over the active detections, mitigating impacted events and severing graph connectivity dynamically.
8. **Updated graph and score**: After applying remediation, the system recalculates the topology and issues a `before` and `after` API result, highlighting exact `security gain`.

### Stateless Server Design & Persistence

The backend architecture comprises Vercel/Nitro serverless-compatible API routes:
- `/api/scenario/ingest`
- `/api/scenario/detect`
- `/api/scenario/graph`
- `/api/scenario/priority`
- `/api/scenario/remediate`

These routes accept pure JSON, process the data via shared functional library logic (`src/lib/*`), and respond securely. No database, server-side caching, or filesystem persistence is utilized. This ensures thread-safe, scalable operation.

Instead, state is preserved purely on the client inside `sessionStorage` utilizing a namespaced schema key (`aegispath.phase3.synthetic-session.v1`), safely isolated from legacy Phase 2 states.

### Frontend Integration

The React UI integrates via `@tanstack/react-query` through the custom `usePhase3Scenario` hook. Mode separation is explicitly maintained via a strict `phase3Mode` boolean toggle. Phase 2 functionality remains entirely preserved and un-mutated when Phase 3 mode is inactive. All UI views (Overview, Threat Events, Graph, Risk Simulation, Audit Trail, Intelligence Brief) feature robust ternary branching to reflect accurate logic streams dynamically without context spillage.

### Synthetic Data Transparency

All telemetry processed in Phase 3 is explicitly labeled as `Synthetic Security Simulation`. Data ingestion is fully transparent. The priority calculations reflect deterministic algorithmic formulas mapped against a localized baseline reference model, and explicitly avoid claiming predictive real-world production incident telemetry accuracy.

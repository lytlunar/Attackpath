import { calculateScenarioState } from '../../../lib/engine';
import type { RemediationApplyRequest, RemediationApplyResponse, AuditEntry } from '../../../lib/types';

export async function POST(request: Request): Promise<Response> {
  let body: RemediationApplyRequest;
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (!body || !body.bundleId) {
    return new Response(JSON.stringify({ error: "bundleId is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  if (body.bundleId !== "patch_wst_02") {
    return new Response(JSON.stringify({ error: "Invalid bundleId" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const state = calculateScenarioState(true);
  
  const auditEntry: AuditEntry = {
    id: "audit_" + Math.random().toString(36).substring(2, 9),
    timestamp: state.remediationTimestamp || new Date().toISOString(),
    user: body.appliedBy || "Demo Analyst",
    action: "Remediation Applied",
    resource: "Patch WST_02 Remediation Bundle",
    ipAddress: "session-local",
    result: "Success",
    dynamic: true
  };

  const response: RemediationApplyResponse = {
    state,
    auditEntry
  };

  return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

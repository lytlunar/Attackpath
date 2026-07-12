import { calculateScenarioState } from '../../../lib/engine';
import type { ScenarioResetResponse, AuditEntry } from '../../../lib/types';

export async function POST(request: Request): Promise<Response> {
  const state = calculateScenarioState(false);
  
  const auditEntry: AuditEntry = {
    id: "audit_" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    user: "Demo Analyst",
    action: "Simulation Reset",
    resource: "AegisPath Scenario",
    ipAddress: "session-local",
    result: "Success",
    dynamic: true
  };

  const response: ScenarioResetResponse = {
    state,
    auditEntry
  };
  
  return new Response(JSON.stringify(response), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

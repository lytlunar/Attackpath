import { calculateScenarioState } from "../../../lib/engine";
import type { ScenarioResetResponse, AuditEntry, ReplayStep } from "../../../lib/types";

export async function POST(request: Request): Promise<Response> {
  let step: ReplayStep = 4;
  try {
    const body = await request.json();
    if (body && body.step !== undefined) {
      if (typeof body.step !== "number" || body.step < 0 || body.step > 4) {
        return new Response(JSON.stringify({ error: "step must be an integer between 0 and 4" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      step = body.step as ReplayStep;
    }
  } catch (err) {
    // Ignore invalid JSON body, fall back to step 4
  }

  const state = calculateScenarioState(false, step);

  const auditEntry: AuditEntry = {
    id: "audit_" + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    user: "Demo Analyst",
    action: "Simulation Reset",
    resource: "AegisPath Scenario",
    ipAddress: "session-local",
    result: "Success",
    dynamic: true,
  };

  const response: ScenarioResetResponse = {
    state,
    auditEntry,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

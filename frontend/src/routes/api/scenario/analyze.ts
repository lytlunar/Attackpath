import { analyzeScenario } from "../../../lib/canonicalEngine";
import type { RawSyntheticEvent } from "../../../lib/rawSyntheticEvent";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const events: RawSyntheticEvent[] = body.events;

    if (!events || !Array.isArray(events)) {
      return new Response(JSON.stringify({ error: "Invalid request envelope: payload must be a JSON object containing an 'events' array." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const actionId = body.remediationActionId || null;

    if (actionId !== null && actionId !== "remediation:patch-wst-02" && actionId !== "patch_wst_02") {
      return new Response(JSON.stringify({ error: "Unknown remediation action" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isRemediated = actionId === "remediation:patch-wst-02" || actionId === "patch_wst_02";

    const result = analyzeScenario(
      { events },
      { applyRemediation: isRemediated }
    );

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Analysis API Error:", err);
    // If the error message implies a client error
    if (err.message && err.message.includes("Invalid request envelope")) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: err.message || "Failed to analyze scenario" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

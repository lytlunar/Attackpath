import { calculateScenarioState } from "../../../lib/engine";
import type { ReplayStep } from "../../../lib/types";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const remediatedParam = url.searchParams.get("remediated");
  const stepParam = url.searchParams.get("step");

  if (remediatedParam !== null && remediatedParam !== "true" && remediatedParam !== "false") {
    return new Response(
      JSON.stringify({ error: "remediated parameter must be 'true' or 'false'" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  let step: ReplayStep = 4;
  if (stepParam !== null) {
    const parsedStep = parseInt(stepParam, 10);
    if (isNaN(parsedStep) || parsedStep < 0 || parsedStep > 4 || stepParam.includes(".")) {
      return new Response(
        JSON.stringify({ error: "step parameter must be an integer between 0 and 4" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    step = parsedStep as ReplayStep;
  }

  const remediated = remediatedParam === "true";
  const state = calculateScenarioState(remediated, step);

  return new Response(JSON.stringify(state), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

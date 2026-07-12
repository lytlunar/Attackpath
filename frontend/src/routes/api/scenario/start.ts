import { calculateScenarioState } from "../../../lib/engine";

export async function POST(request: Request): Promise<Response> {
  const state = calculateScenarioState(false, 0);
  return new Response(JSON.stringify(state), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

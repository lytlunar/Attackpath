import { calculateScenarioState } from '../../../lib/engine';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const remediatedParam = url.searchParams.get('remediated');

  if (remediatedParam !== null && remediatedParam !== 'true' && remediatedParam !== 'false') {
    return new Response(
      JSON.stringify({ error: "remediated parameter must be 'true' or 'false'" }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const remediated = remediatedParam === 'true';
  const state = calculateScenarioState(remediated);
  
  return new Response(JSON.stringify(state), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

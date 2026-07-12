import { calculateScenarioState } from '../../../lib/engine';
import type { RemediationPreview, RemediationPreviewRequest } from '../../../lib/types';

export async function POST(request: Request): Promise<Response> {
  let body: RemediationPreviewRequest;
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

  const baseline = calculateScenarioState(false);
  const remediated = calculateScenarioState(true);
  
  const severedEdgeId = remediated.chokepointEdge.id;
  
  // Nodes that were reachable in baseline but are not reachable in remediated state.
  const isolatedNodeIds = baseline.blastRadius.reachableAssetIds.filter(
    id => !remediated.blastRadius.reachableAssetIds.includes(id)
  );

  const preview: RemediationPreview = {
    bundleId: body.bundleId,
    projectedScore: remediated.score,
    projectedBlastRadius: remediated.blastRadius,
    securityGain: remediated.securityGain,
    severedEdgeId,
    isolatedNodeIds,
    pathStatusAfter: remediated.pathStatus
  };

  return new Response(JSON.stringify(preview), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

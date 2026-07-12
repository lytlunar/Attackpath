import { calculateScenarioState } from "../../../lib/engine";
import type { RemediationPreview, RemediationPreviewRequest, ReplayStep } from "../../../lib/types";

export async function POST(request: Request): Promise<Response> {
  let body: RemediationPreviewRequest & { step?: number };
  try {
    body = await request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body || !body.bundleId) {
    return new Response(JSON.stringify({ error: "bundleId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (body.bundleId !== "patch_wst_02") {
    return new Response(JSON.stringify({ error: "Invalid bundleId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Default to step 4 for backward compatibility with Phase 1 callers that omit step.
  // Step-aware callers (Stage 3+) supply the current replay step explicitly.
  let step: ReplayStep = 4;
  if (body.step !== undefined) {
    if (typeof body.step !== "number" || body.step < 0 || body.step > 4) {
      return new Response(JSON.stringify({ error: "step must be an integer between 0 and 4" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (body.step < 2) {
      return new Response(
        JSON.stringify({
          error: "Preview not available before Step 2 (chokepoint must be detected first)",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    }
    step = body.step as ReplayStep;
  }

  const baseline = calculateScenarioState(false, step);
  const remediated = calculateScenarioState(true, step);

  const severedEdgeId = remediated.chokepointEdge.id;

  // Nodes that were reachable in baseline but are not reachable in remediated state.
  const isolatedNodeIds = baseline.blastRadius.reachableAssetIds.filter(
    (id) => !remediated.blastRadius.reachableAssetIds.includes(id),
  );

  // Security gain at this replay step: current unrepaired score minus remediated score
  const stepSecurityGain = baseline.score.total - remediated.score.total;

  const preview: RemediationPreview = {
    bundleId: body.bundleId,
    before: {
      riskScore: baseline.score.total,
      riskLevel: baseline.score.label,
      blastRadius: baseline.blastRadius.percentage,
      pathStatus: baseline.pathStatus,
    },
    after: {
      riskScore: remediated.score.total,
      riskLevel: remediated.score.label,
      blastRadius: remediated.blastRadius.percentage,
      pathStatus: remediated.pathStatus,
    },
    projectedScoreReduction: stepSecurityGain,
    projectedScore: remediated.score,
    projectedBlastRadius: remediated.blastRadius,
    securityGain: stepSecurityGain,
    severedEdgeId,
    isolatedNodeIds,
    pathStatusAfter: remediated.pathStatus,
  };

  return new Response(JSON.stringify(preview), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

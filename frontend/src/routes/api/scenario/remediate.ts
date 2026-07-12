import { validateSyntheticEventBatch, type RejectedSyntheticEvent } from "../../../lib/rawSyntheticEvent";
import { evaluateDetectionRules } from "../../../lib/detectionRules";
import { applySyntheticRemediation, type SyntheticRemediationResult } from "../../../lib/remediation";

const MAX_BATCH_SIZE = 100;

export type SyntheticRemediationResponse = {
  synthetic: true;
  acceptedEventCount: number;
  rejectedEventCount: number;
  result: SyntheticRemediationResult;
  rejected: RejectedSyntheticEvent[];
};

export async function POST(request: Request): Promise<Response> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return new Response(
      JSON.stringify({ error: "Unsupported Media Type: expected application/json" }),
      { status: 415, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("events" in body) ||
    !Array.isArray((body as Record<string, unknown>).events) ||
    !("actionId" in body) ||
    typeof (body as Record<string, unknown>).actionId !== "string"
  ) {
    return new Response(
      JSON.stringify({ error: "Invalid request payload. Expected 'events' array and 'actionId' string." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const events = (body as Record<string, unknown>).events as unknown[];
  const actionId = (body as Record<string, unknown>).actionId as string;

  if (events.length > MAX_BATCH_SIZE) {
    return new Response(
      JSON.stringify({
        error: `Payload too large. Maximum batch size is ${MAX_BATCH_SIZE} events.`,
      }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const validationResult = validateSyntheticEventBatch({ events });
    const validEvents = validationResult.validEvents.map(ve => ve.event);
    const detections = evaluateDetectionRules(validEvents);

    const result = applySyntheticRemediation(detections, actionId);

    const responseData: SyntheticRemediationResponse = {
      synthetic: true,
      acceptedEventCount: validEvents.length,
      rejectedEventCount: validationResult.rejected.length,
      result,
      rejected: validationResult.rejected,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid request envelope";
    
    if (errorMessage.includes("Unknown remediation action")) {
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

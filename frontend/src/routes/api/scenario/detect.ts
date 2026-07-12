import { validateSyntheticEventBatch, type RejectedSyntheticEvent } from "../../../lib/rawSyntheticEvent";
import { evaluateDetectionRules, type SyntheticDetection } from "../../../lib/detectionRules";

const MAX_BATCH_SIZE = 100;

export type SyntheticDetectionResponse = {
  synthetic: true;
  acceptedEventCount: number;
  rejectedEventCount: number;
  detections: SyntheticDetection[];
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

  // Enforce payload limit
  if (
    body &&
    typeof body === "object" &&
    "events" in body &&
    Array.isArray((body as Record<string, unknown>).events)
  ) {
    const events = (body as Record<string, unknown>).events as unknown[];
    if (events.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({
          error: `Payload too large. Maximum batch size is ${MAX_BATCH_SIZE} events.`,
        }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  try {
    // Stage 2 Validation
    const validationResult = validateSyntheticEventBatch(body);
    
    // Extract valid events
    const validEvents = validationResult.validEvents.map(ve => ve.event);
    
    // Stage 3 Detection Rules
    const detections = evaluateDetectionRules(validEvents);

    const responseData: SyntheticDetectionResponse = {
      synthetic: true,
      acceptedEventCount: validEvents.length,
      rejectedEventCount: validationResult.rejected.length,
      detections,
      rejected: validationResult.rejected,
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Invalid request envelope";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
}

import { validateSyntheticEventBatch, type SyntheticIngestionResponse } from "../../../lib/rawSyntheticEvent";

const MAX_BATCH_SIZE = 100;

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

  // Enforce payload limit before deep validation
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
    const result = validateSyntheticEventBatch(body);
    
    // Transform internal result to public API response
    const publicResponse: SyntheticIngestionResponse = {
      synthetic: true,
      acceptedCount: result.validEvents.length,
      rejectedCount: result.rejected.length,
      accepted: result.validEvents.map(ve => ({
        id: ve.event.id,
        index: ve.index,
      })),
      rejected: result.rejected,
    };

    return new Response(JSON.stringify(publicResponse), {
      status: 200, // Return 200 even if some/all events are rejected, since the envelope was valid
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

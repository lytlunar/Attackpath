import { z } from "zod";

export const rawSyntheticEventSchema = z.object({
  id: z.string().min(1, "Event ID is required"),
  schemaVersion: z.string().min(1, "Schema version is required"),
  synthetic: z.literal(true, {
    errorMap: () => ({ message: "Event must explicitly declare synthetic: true" }),
  }),
  timestamp: z.string().datetime({ message: "Must be a valid ISO 8601 timestamp" }),

  source: z.object({
    category: z.enum(["identity", "endpoint", "network", "directory", "cloud", "security"]),
    product: z.string().min(1, "Source product is required"),
    vendor: z.string().optional(),
  }),

  eventType: z.string().min(1, "Event type is required"),
  action: z.string().optional(),
  outcome: z.enum(["success", "failure", "unknown"]).optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),

  actor: z.object({
    userId: z.string().optional(),
    userName: z.string().optional(),
    accountType: z.enum(["human", "service", "machine"]).optional(),
    privileged: z.boolean().optional(),
  }).optional(),

  targetIdentity: z.object({
    id: z.string().optional(),
    accountType: z.enum(["human", "service", "machine"]).optional(),
    privileged: z.boolean().optional(),
  }).optional(),

  sourceAsset: z.object({
    id: z.string().optional(),
    hostname: z.string().optional(),
    ip: z.string().ip().optional(),
    assetType: z.string().optional(),
  }).optional(),

  targetAsset: z.object({
    id: z.string().optional(),
    hostname: z.string().optional(),
    ip: z.string().ip().optional(),
    assetType: z.string().optional(),
    criticality: z.enum(["low", "medium", "high", "critical"]).optional(),
  }).optional(),

  process: z.object({
    name: z.string().optional(),
    path: z.string().optional(),
    commandLine: z.string().optional(),
    parentName: z.string().optional(),
    targetProcess: z.string().optional(),
  }).optional(),

  authentication: z.object({
    protocol: z.string().optional(),
    logonType: z.string().optional(),
    mfaUsed: z.boolean().optional(),
    application: z.string().optional(),
  }).optional(),

  directory: z.object({
    operation: z.string().optional(),
    objectType: z.string().optional(),
    privilegedSid: z.string().optional(),
  }).optional(),

  network: z.object({
    sourceIp: z.string().ip().optional(),
    destinationIp: z.string().ip().optional(),
    destinationPort: z.number().int().min(1).max(65535).optional(),
  }).optional(),

  metadata: z.record(z.unknown()).optional(),
});

export type RawSyntheticEvent = z.infer<typeof rawSyntheticEventSchema>;

export const syntheticIngestionRequestSchema = z.object({
  events: z.array(z.unknown()),
});

export type SyntheticIngestionRequest = z.infer<typeof syntheticIngestionRequestSchema>;

export type ValidatedSyntheticEvent = {
  index: number;
  event: RawSyntheticEvent;
};

export type RejectedSyntheticEvent = {
  index: number;
  id?: string;
  issues: {
    path: string;
    message: string;
    code: string;
  }[];
};

export type SyntheticBatchValidationResult = {
  synthetic: true;
  validEvents: ValidatedSyntheticEvent[];
  rejected: RejectedSyntheticEvent[];
};

export type SyntheticIngestionResponse = {
  synthetic: true;
  acceptedCount: number;
  rejectedCount: number;
  accepted: {
    id: string;
    index: number;
  }[];
  rejected: RejectedSyntheticEvent[];
};

export function validateSyntheticEventBatch(input: unknown): SyntheticBatchValidationResult {
  const reqResult = syntheticIngestionRequestSchema.safeParse(input);
  if (!reqResult.success) {
    throw new Error("Invalid request envelope: payload must be a JSON object containing an 'events' array.");
  }

  const events = reqResult.data.events;
  const result: SyntheticBatchValidationResult = {
    synthetic: true,
    validEvents: [],
    rejected: [],
  };

  events.forEach((evt, index) => {
    const parseResult = rawSyntheticEventSchema.safeParse(evt);
    if (parseResult.success) {
      result.validEvents.push({
        index,
        event: parseResult.data,
      });
    } else {
      const issues = parseResult.error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      let eventId: string | undefined = undefined;
      if (typeof evt === "object" && evt !== null && "id" in evt && typeof (evt as Record<string, unknown>).id === "string") {
        eventId = (evt as Record<string, unknown>).id as string;
      }

      result.rejected.push({
        index,
        id: eventId,
        issues,
      });
    }
  });

  return result;
}

import { IngestedEvent, BatchEventsRequest } from "../types/events";

export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly field?: string;

  constructor(message: string, field?: string, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
    this.field = field;
  }
}

export function validateSingleEvent(payload: any): IngestedEvent {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Body must be a JSON object", undefined);
  }

  const {
    tenant_id,
    project_id,
    event_type,
    timestamp,
    user_id,
    session_id,
    properties,
    idempotency_key
  } = payload;

  if (!event_type || typeof event_type !== "string") {
    throw new ValidationError("event_type is required and must be a string", "event_type");
  }

  if (!timestamp || typeof timestamp !== "string") {
    throw new ValidationError("timestamp is required and must be an ISO 8601 string", "timestamp");
  }

  // Basic timestamp sanity check (doesn't validate every edge case)
  if (Number.isNaN(Date.parse(timestamp))) {
    throw new ValidationError("timestamp must be a valid ISO 8601 datetime string", "timestamp");
  }

  if (properties === undefined || typeof properties !== "object" || Array.isArray(properties)) {
    throw new ValidationError("properties is required and must be an object", "properties");
  }

  // Optional fields validation (if present)
  if (tenant_id !== undefined && typeof tenant_id !== "string") {
    throw new ValidationError("tenant_id must be a string when provided", "tenant_id");
  }

  if (project_id !== undefined && typeof project_id !== "string") {
    throw new ValidationError("project_id must be a string when provided", "project_id");
  }

  if (user_id !== undefined && typeof user_id !== "string") {
    throw new ValidationError("user_id must be a string when provided", "user_id");
  }

  if (session_id !== undefined && typeof session_id !== "string") {
    throw new ValidationError("session_id must be a string when provided", "session_id");
  }

  if (idempotency_key !== undefined && typeof idempotency_key !== "string") {
    throw new ValidationError("idempotency_key must be a string when provided", "idempotency_key");
  }

  const event: IngestedEvent = {
    tenant_id,
    project_id,
    event_type,
    timestamp,
    user_id,
    session_id,
    properties,
    idempotency_key
  };

  return event;
}

export function validateBatchEvents(payload: any): BatchEventsRequest {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError("Body must be a JSON object", undefined);
  }

  const { events } = payload;

  if (!Array.isArray(events) || events.length === 0) {
    throw new ValidationError("events must be a non-empty array", "events");
  }

  const validatedEvents = events.map((e, index) => {
    try {
      return validateSingleEvent(e);
    } catch (err) {
      if (err instanceof ValidationError) {
        // add context about which index failed
        throw new ValidationError(
          `Event at index ${index} is invalid: ${err.message}`,
          err.field,
          err.statusCode
        );
      }
      throw err;
    }
  });

  return { events: validatedEvents };
}


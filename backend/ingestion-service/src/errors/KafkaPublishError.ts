// src/errors/KafkaPublishError.ts
export class KafkaPublishError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = "KafkaPublishError";
    this.statusCode = 503; // Service Unavailable
    this.code = "KAFKA_PUBLISH_FAILED";
    this.details = details;
  }
}


import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../services/validation";
import { KafkaPublishError } from "../errors/KafkaPublishError"; // ✅ new

interface ErrorResponseBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response<ErrorResponseBody>,
  _next: NextFunction
): void {
  console.error("Error processing request:", err);

  if (err instanceof ValidationError) {
    res.status(err.statusCode).json({
      error: {
        code: "INVALID_REQUEST",
        message: err.message,
        details: err.field ? { field: err.field } : undefined
      }
    });
    return;
  }

  // ✅ new: Kafka-specific error handling
  if (err instanceof KafkaPublishError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      }
    });
    return;
  }

  // TODO: later we can handle auth, Kafka, etc., with specific error classes

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }
  });
}


import { NextFunction, Request, Response } from "express";
import { ValidationError } from "../services/validation";

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

  // TODO: later we can handle auth, Kafka, etc., with specific error classes

  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred"
    }
  });
}

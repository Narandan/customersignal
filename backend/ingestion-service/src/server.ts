import express, { Application } from "express";
import { healthRouter } from "./routes/health";
import { eventsRouter } from "./routes/events";
import { errorHandler } from "./middleware/errorHandler";

export function createServer(): Application {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Routes
  app.use("/health", healthRouter);
  app.use("/v1/events", eventsRouter);

  // Centralized error handler (must be after routes)
  app.use(errorHandler);

  return app;
}


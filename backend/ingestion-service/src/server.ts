import express, { Application } from "express";
import { healthRouter } from "./routes/health";

export function createServer(): Application {
  const app = express();

  // Basic middleware
  app.use(express.json());

  // Routes
  app.use("/health", healthRouter);

  return app;
}


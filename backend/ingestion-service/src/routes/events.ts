import { Router, Request, Response, NextFunction } from "express";
import { validateSingleEvent, validateBatchEvents } from "../services/validation";

export const eventsRouter = Router();

/**
 * POST /v1/events
 * Ingest a single event.
 */
eventsRouter.post(
  "/",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedEvent = validateSingleEvent(req.body);

      // TODO: derive tenant_id from API key rather than trusting the body
      // TODO: produce to Kafka instead of console.log

      console.log("[events] accepted single event:", {
        event_type: validatedEvent.event_type,
        timestamp: validatedEvent.timestamp,
        tenant_id: validatedEvent.tenant_id,
        project_id: validatedEvent.project_id
      });

      // In future: generate event_id, trace_id, etc.
      res.status(202).json({
        status: "accepted",
        source: "ingestion-service"
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /v1/events/batch
 * Ingest a batch of events.
 */
eventsRouter.post(
  "/batch",
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { events } = validateBatchEvents(req.body);

      console.log("[events] accepted batch:", {
        count: events.length
      });

      // TODO: publish each event to Kafka

      res.status(202).json({
        status: "accepted",
        accepted: events.length,
        failed: 0
      });
    } catch (err) {
      next(err);
    }
  }
);


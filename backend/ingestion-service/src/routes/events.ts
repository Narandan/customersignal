import { Router, Request, Response, NextFunction } from "express";
import { validateSingleEvent, validateBatchEvents } from "../services/validation";
import { getKafkaProducer } from "../lib/kafka";
import { KafkaPublishError } from "../errors/KafkaPublishError";

export const eventsRouter = Router();

/**
 * POST /v1/events
 * Ingest a single event.
 */
eventsRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    // 1️⃣ First: run validation in its own try/catch
    let validatedEvent;
    try {
      validatedEvent = validateSingleEvent(req.body);
    } catch (err) {
      // Let the global errorHandler handle ValidationError (and others) correctly
      return next(err);
    }

    // Then: Kafka publishing in a separate try/catch
    try {
      const tenantId = validatedEvent.tenant_id;
      if (!tenantId) {
        // Should be guaranteed by validation, but keep a safety net
        throw new KafkaPublishError("Missing tenant_id for Kafka message key", {
          event: validatedEvent
        });
      }

      const producer = getKafkaProducer();
      const topic = "events_raw"; // can move to env later

      const enrichedEvent = {
        ...validatedEvent,
        _meta: {
          received_at: new Date().toISOString(),
          source: "ingestion-service"
        }
      };

      await producer.send({
        topic,
        messages: [
          {
            key: tenantId,
            value: JSON.stringify(enrichedEvent)
          }
        ]
      });

      console.log("[events] published single event to Kafka:", {
        event_type: validatedEvent.event_type,
        timestamp: validatedEvent.timestamp,
        tenant_id: validatedEvent.tenant_id,
        project_id: validatedEvent.project_id
      });

      return res.status(202).json({
        status: "accepted",
        source: "ingestion-service",
        queued: true
      });
    } catch (err) {
      if (err instanceof KafkaPublishError) {
        return next(err);
      }

      console.error("[events] Kafka publish error:", err);
      return next(
        new KafkaPublishError("Failed to publish event to Kafka", {
          originalError: (err as Error).message
        })
      );
    }
  }
);

/**
 * POST /v1/events/batch
 * Ingest a batch of events.
 * (Still stubbed: just validates + logs, no Kafka yet.)
 */
/**
 * POST /v1/events/batch
 * Ingest a batch of events.
 */
eventsRouter.post(
  "/batch",
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate first
    let validated;
    try {
      validated = validateBatchEvents(req.body);
    } catch (err) {
      return next(err);
    }

    const { events } = validated;

    // Publish to Kafka
    try {
      const producer = getKafkaProducer();
      const topic = "events_raw";

      const messages = events.map((event) => {
        if (!event.tenant_id) {
          throw new KafkaPublishError(
            "Missing tenant_id for Kafka message key",
            { event }
          );
        }

        return {
          key: event.tenant_id,
          value: JSON.stringify({
            ...event,
            _meta: {
              received_at: new Date().toISOString(),
              source: "ingestion-service"
            }
          })
        };
      });

      await producer.send({
        topic,
        messages
      });

      console.log("[events] published batch to Kafka:", {
        count: messages.length
      });

      return res.status(202).json({
        status: "accepted",
        accepted: messages.length,
        failed: 0
      });

    } catch (err) {
      if (err instanceof KafkaPublishError) {
        return next(err);
      }

      console.error("[events] Kafka batch publish error:", err);
      return next(
        new KafkaPublishError("Failed to publish batch to Kafka", {
          originalError: (err as Error).message
        })
      );
    }
  }
);


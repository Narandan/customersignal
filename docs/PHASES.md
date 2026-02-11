# CustomerSignal – Phase Roadmap

This document outlines the major phases for building CustomerSignal and what each phase is responsible for.

---

## Phase 1 – Architecture

**Goal:** Define the overall system architecture and the main components.

- Clarify core concepts (tenant, event, metric, alert, event catalog).
- Define subsystems: Ingestion, Streaming/Processing, Storage, Serving/UI, Infra.
- Document the end-to-end event lifecycle.
- Capture scaling, consistency, and trade-off assumptions.

**Output:** `ARCHITECTURE.md` describing the system in real-world engineering terms.

---

## Phase 2 – Ingestion API

**Goal:** Build the HTTP endpoint where external apps send events.

- Stand up a minimal backend service (Node.js + TypeScript).
- Implement `POST /v1/events` with:
  - API key authentication (tenant-scoped).
  - Basic payload validation and event schema structure.
- Wire the ingestion service to Kafka as a producer.
- Add basic logging and error handling.

**Output:** Running ingestion API service and events being written into a Kafka topic (locally via Docker).

---

## Phase 3 – Kafka Pipeline

**Goal:** Stand up the message broker and formalize topics.

- Add Kafka (and ZooKeeper or equivalent) via Docker Compose.
- Define topics: `events_raw` (and optionally `events_enriched` later).
- Confirm ingestion service successfully produces events to Kafka.
- Decide on partitioning strategy (initially by `tenant_id`).

**Output:** Reliable event pipeline from HTTP ingestion → Kafka topic.

---

## Phase 4 – Consumer + Aggregation

**Goal:** Turn raw events into usable metrics.

- Implement an Aggregator Consumer that reads from `events_raw`.
- Design initial aggregation strategy:
  - Simple counts per `event_type` per time bucket.
- Write aggregates to Redis (hot) and to relational DB (persistent).
- Handle basic failure scenarios and logging.

**Output:** A working streaming consumer that maintains live metrics from real-time events.

---

## Phase 5 – DB Schema

**Goal:** Design the relational model for core entities.

- Choose DB (Postgres recommended).
- Design schemas for:
  - Tenants, API keys, projects/sources.
  - Event catalog (event types + metadata).
  - Aggregated metrics tables.
  - Alert rules.
- Implement migrations (using a migration tool).

**Output:** A versioned DB schema that supports tenants, events, metrics, and alerts configuration.

---

## Phase 6 – Dashboard

**Goal:** Build a UI to see metrics and explore events.

- Implement Dashboard API to query metrics and events.
- Stand up a React + TypeScript frontend.
- Views:
  - Metrics overview (charts over time).
  - Event explorer (filter by event type, user, time).
- Integrate with Redis + DB data.

**Output:** A functional web dashboard that shows live metrics from the pipeline.

---

## Phase 7 – Alerts Engine

**Goal:** Define and trigger alerts based on metrics.

- Implement alert rule definitions (CRUD via API).
- Implement an Alert Engine (consumer or scheduled worker).
- Evaluate rules over recent metrics in Redis/DB.
- Add basic notification channels (e.g., console logs or webhooks initially).

**Output:** Working alerts that trigger when conditions are met.

---

## Phase 8 – Deployment & Observability

**Goal:** Make the system runnable and observable in a realistic environment.

- Create `docker-compose.yml` for local multi-service setup.
- Add environment configuration (env files, sensible defaults).
- Add basic observability:
  - Structured logging.
  - Basic metrics (requests per second, consumer lag).
- Discuss/plan production-style deployment (Kubernetes/ECS conceptually).

**Output:** One-command local environment and a clear deployment story.

---

## Phase 9 – Add-ons & Advanced Features

**Goal:** Add “bonus” features that demonstrate advanced system design.

- Dead-letter queues (DLQ) for poison messages.
- Retry policies for failed event processing.
- Tracing (OpenTelemetry-style) across services.
- Optional anomaly detection on metrics (e.g., simple statistical alerts).

**Output:** A richer, more robust platform with features you can showcase in interviews and on your resume.


# CustomerSignal – High-Level Architecture

## 1. Overview

CustomerSignal is a real-time event analytics and alerting platform.

External applications send JSON events (e.g., `user_signed_up`, `checkout_completed`) to CustomerSignal via an HTTP ingestion API. Events are written to a durable event log (Kafka), processed by streaming consumers for aggregation and alerts, stored in databases for querying, and surfaced through a web dashboard.

**Core goals:**

- Near real-time visibility into product and system behavior.
- Durable event storage and replay.
- Flexible aggregation and alerting on top of event streams.
- An architecture that resembles real-world distributed analytics systems.

---

## 2. Core Concepts

- **Tenant**  
  A customer using CustomerSignal (e.g., a company or product team). All data and configuration is scoped by `tenant_id`.

- **Project / Source**  
  A logical source of events (e.g., “web-app”, “mobile-app”, “backend-service”).

- **Event**  
  A single tracked action or signal from a source. Core fields:
  - `tenant_id`
  - `project_id`
  - `event_type`
  - `timestamp`
  - `user_id` (optional)
  - `session_id` (optional)
  - `properties` (flexible JSON)

- **Metric / Aggregate**  
  A derived value computed from events, e.g.:
  - Count of `signup` events per 5-minute window.
  - Error rate for a `login_failed` event.

- **Alert Rule**  
  A condition defined over metrics, e.g.:
  - “If `checkout_failed` count > 10 in 5 minutes → send alert.”

- **Event Catalog**  
  Per-tenant registry of known event types and their properties (schema-like metadata).

---

## 3. High-Level Architecture

At a high level, CustomerSignal is composed of four main subsystems:

1. **Ingestion**
2. **Streaming / Processing**
3. **Storage**
4. **Serving & UI**

### 3.1 Ingestion Subsystem

**Responsibilities:**

- Expose an HTTP API for external producers to send events.
- Authenticate tenants via API keys.
- Validate event payloads against basic rules and the event catalog.
- Enqueue valid events into the message broker (Kafka) for downstream processing.

**Key component:**

- **Ingestion API Service**
  - Likely implemented in Node.js + TypeScript.
  - Endpoint: `POST /v1/events`
  - Writes events to Kafka topic `events_raw` using a Kafka producer.
  - Partition key: `tenant_id` (or `user_id` for per-user ordering).

**System design principles:**

- **Decoupling producers from consumers** via a message broker.
- **Backpressure handling**: the Ingestion API writes to Kafka instead of directly hitting databases.

---

### 3.2 Streaming / Processing Subsystem

**Responsibilities:**

- Consume events from Kafka.
- Perform transformations and aggregations.
- Evaluate alert rules in near real-time.
- Write derived results to fast and persistent storage.

**Key components:**

- **Aggregator Consumer**
  - Subscribes to `events_raw`.
  - For each event, updates:
    - Time-windowed counters (e.g., events per minute).
    - Aggregated metrics in Redis and relational DB.

- **Alert Engine Consumer**
  - Subscribes to `events_raw` or an enriched topic (e.g., `events_enriched`).
  - Checks events against configured alert rules.
  - Uses recent metrics (from Redis/DB) to evaluate windows.
  - Emits alert notifications (e.g., webhook, email – later phases).

**System design principles:**

- **Immutable event log** as the source of truth.
- **Separation of raw events and derived data** (metrics and alerts).
- **Reprocessability**: consumers can replay events from Kafka offsets if logic changes.

---

### 3.3 Storage Subsystem

**Responsibilities:**

- Persist configuration, raw events, and aggregates.
- Support replay, analytics, dashboards, and alert evaluation.

**Planned stores:**

1. **Relational DB (Postgres or MySQL)**  
   - Tenants, API keys, projects.
   - Event catalog (known event types and schemas).
   - Alert rules and dashboard configurations.
   - Optionally, raw events and/or aggregate tables in early versions.

2. **Events Store (initially in the relational DB)**  
   - Append-only tables for raw events.
   - Indexed for common query patterns (by tenant, time, event type).

3. **Redis (cache / fast store)**  
   - Hot aggregates:
     - Keys like `{tenant_id}:{metric_key}:{time_bucket}` → numeric value.
   - Used for low-latency metric reads and alert evaluations.

**System design principles:**

- **Separate operational configuration from analytics data**.
- **Use the right store for the right access pattern**:
  - Relational DB → consistency and relational queries.
  - Redis → low-latency metric reads.
  - Kafka → durable event log and replay.

---

### 3.4 Serving & UI Subsystem

**Responsibilities:**

- Provide APIs for dashboards, event exploration, and alert configuration.
- Render a web UI for tenants to view metrics and manage settings.

**Key components:**

- **Dashboard API**
  - Backend service (e.g., Node.js + TypeScript).
  - Endpoints for:
    - Fetching metrics (reads mostly from Redis + aggregates in DB).
    - Listing events (reads from events store).
    - Managing alert rules and event catalog entries.

- **Dashboard Frontend**
  - React + TypeScript SPA.
  - Views:
    - Metrics overview (time-series charts).
    - Event explorer (filterable, paginated list of events).
    - Alerts configuration (create/edit alert rules).

**System design principles:**

- **Read path optimized for speed** (pre-aggregated metrics).
- **Config-driven dashboards** (UI reads configuration from backend, rather than hard-coded metrics).

---

## 4. Event Lifecycle (End-to-End)

1. An external app sends an event to `POST /v1/events` with an API key.
2. The Ingestion API:
   - Authenticates the tenant.
   - Validates the payload.
   - Produces the event to Kafka topic `events_raw`, keyed by `tenant_id`.
3. Kafka durably stores the event and exposes it to consumers.
4. The Aggregator Consumer:
   - Reads the event from `events_raw`.
   - Computes relevant metric updates.
   - Writes updates to Redis and aggregate tables in the relational DB.
5. The Alert Engine Consumer:
   - Reads the event and/or derived metrics.
   - Evaluates alert rules.
   - Emits alert notifications if conditions are met.
6. The Dashboard API:
   - Serves metrics and event data from Redis and DB to the frontend.
7. The Dashboard Frontend:
   - Renders charts, tables, and alerts to the user.

---

## 5. Scaling & Partitioning Strategy (Conceptual)

Even in early versions, the architecture is designed with scaling in mind:

- **Kafka partitioning**
  - Topic: `events_raw`
  - Partition key: `tenant_id` (or `user_id` where appropriate).
  - Guarantees per-tenant ordering and enables horizontal scaling via more partitions.

- **Consumers and Consumer Groups**
  - Aggregator and Alert Engine run as consumer groups.
  - Additional instances can be started to process partitions in parallel.

- **Database scaling**
  - Initial deployment uses a single relational DB instance.
  - All schemas are tenant-aware (`tenant_id` included), enabling future sharding by tenant.

- **Caching strategy**
  - Redis used to offload frequent metric reads from the DB.
  - Supports high read throughput for dashboards and alert evaluations.

---

## 6. Consistency and Trade-offs

- **Strong consistency (desired)**
  - Tenant configuration, API keys, and alert rules in the relational DB.
  - Event acceptance: once the ingestion API acknowledges a request, the event should be durably stored in Kafka.

- **Eventual consistency (accepted)**
  - Dashboards and metrics may lag slightly behind real-time (seconds).
  - Alerts are evaluated on recent aggregates and may have slight delay.

This trade-off improves throughput and resilience by decoupling the ingestion path from the serving path.

---

## 7. Phase Roadmap (High Level)

- **Phase 1 — Architecture**
  - Define architecture, components, and data flow (this document).
- **Phase 2 — Ingestion API**
  - Implement HTTP event ingestion service and Kafka producer.
- **Phase 3 — Kafka Pipeline**
  - Stand up Kafka, define topics, and wire ingestion to Kafka.
- **Phase 4 — Consumer + Aggregation**
  - Implement aggregator consumer and basic metrics storage (Redis + DB).
- **Phase 5 — DB Schema**
  - Design and implement relational schemas for tenants, events, metrics, and alerts.
- **Phase 6 — Dashboard**
  - Build Dashboard API and React frontend for metrics and event exploration.
- **Phase 7 — Alerts Engine**
  - Implement alert rule evaluation and basic notification channels.
- **Phase 8 — Deployment Considerations**
  - Docker-compose setup, environment configuration, and basic observability.
- **Phase 9 — Add-ons**
  - DLQs, advanced metrics, tracing, and optional anomaly detection.

---

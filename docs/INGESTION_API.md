# CustomerSignal – Ingestion API Design

## 1. Overview

The **Ingestion API** is the entry point for all events flowing into CustomerSignal.

External applications send JSON events to the Ingestion API over HTTP. The service authenticates the request, validates the payload, and publishes the event(s) to a Kafka topic for downstream processing.

The Ingestion API is designed to be:

- **Durable-first** – once an event is acknowledged, it must be safely stored in Kafka.
- **Decoupled** – the API does not depend on streaming consumers or downstream databases being available.
- **Simple to integrate** – a single, well-defined endpoint for sending events.

This document describes the API surface, request/response schema, error model, and Kafka integration.

---

## 2. Responsibilities & Non-goals

### 2.1 Responsibilities

The Ingestion API is responsible for:

- Exposing HTTP endpoints for single and batched event ingestion.
- Authenticating requests using tenant-scoped API keys.
- Performing basic validation of event payloads.
- Mapping API keys to `tenant_id` (and optionally `project_id`).
- Publishing events to the `events_raw` Kafka topic.
- Returning an appropriate response status (`202 Accepted` on success).
- Logging request and error information for observability.

### 2.2 Non-goals (v1)

The Ingestion API is **not** responsible for:

- Aggregating or computing metrics (handled by streaming consumers).
- Evaluating alert rules (handled by the Alerts Engine).
- Serving dashboards or querying stored data.
- Complex schema enforcement beyond basic type and required-field checks.
- Rate limiting and quota enforcement (may be added in later phases).

---

## 3. Service Architecture

### 3.1 Service Name & Location

- **Service name:** `ingestion-service`
- **Repo path:** `backend/ingestion-service/`

### 3.2 Tech Stack (v1 choice)

- **Language:** TypeScript
- **Runtime:** Node.js (LTS)
- **Framework:** Express.js (simple, well-known, great ecosystem)
- **Kafka Client:** `kafkajs` or similar Node Kafka client

**Why Node + TypeScript?**

- Fast iteration and good developer experience.
- Strong typing for request/response schemas.
- Easy integration with JSON-heavy workloads.
- Familiar in modern backend + frontend stacks.

Later, if desired, streaming consumers can be implemented in a different language (e.g., Java/Kotlin) without changing the overall architecture.

### 3.3 Dependencies

In local development, the Ingestion API depends on:

- Kafka broker (e.g., `kafka:9092` in Docker Compose).
- Relational DB for API keys & tenant config (Postgres, later; v1 may stub or mock this).

---

## 4. Authentication Model

### 4.1 API Key Header

Requests to the Ingestion API are authenticated using an API key sent in a header:

- Header: `X-CS-API-Key`
- Value: opaque API key string, unique per tenant (and optionally per project).

Example:

http
X-CS-API-Key: cs_live_abc123xyz

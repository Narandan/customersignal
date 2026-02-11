export interface IngestedEvent {
  tenant_id?: string; // can be derived from API key later
  project_id?: string;
  event_type: string;
  timestamp: string;
  user_id?: string;
  session_id?: string;
  properties: Record<string, unknown>;
  idempotency_key?: string;
}

export interface BatchEventsRequest {
  events: IngestedEvent[];
}


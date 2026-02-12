CREATE TABLE IF NOT EXISTS events_ingested (
  id BIGSERIAL PRIMARY KEY,

  kafka_topic TEXT NOT NULL,
  kafka_partition INT NOT NULL,
  kafka_offset BIGINT NOT NULL,
  kafka_timestamp_ms BIGINT,

  message_key TEXT,
  message_value JSONB NOT NULL,

  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (kafka_topic, kafka_partition, kafka_offset)
);

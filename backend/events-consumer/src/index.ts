import { Kafka, logLevel } from "kafkajs";
import { Pool } from "pg";

const BROKERS = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const GROUP_ID = process.env.KAFKA_GROUP_ID || "events-consumer-1";
const TOPIC = process.env.KAFKA_TOPIC || "events_raw";

const pgPool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "customersignal",
  user: process.env.PGUSER || "customersignal",
  password: process.env.PGPASSWORD || "devpassword",
});

// Safely convert Kafka buffers to string
function bufToString(b: Buffer | null): string | null {
  if (!b) return null;
  return b.toString("utf8");
}

async function main() {
  const kafka = new Kafka({
    clientId: "events-consumer",
    brokers: BROKERS,
    logLevel: logLevel.INFO,
  });

  const consumer = kafka.consumer({ groupId: GROUP_ID });

  const shutdown = async (signal: string) => {
    try {
      console.log(`[events-consumer] Received ${signal}, shutting down...`);
      await consumer.disconnect();
      await pgPool.end();
      process.exit(0);
    } catch (err) {
      console.error("[events-consumer] Shutdown error:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await consumer.connect();
  await consumer.subscribe({ topic: TOPIC, fromBeginning: false });

  console.log(
    `[events-consumer] Connected. groupId=${GROUP_ID} topic=${TOPIC} brokers=${BROKERS.join(
      ","
    )}`
  );

  console.log(`[events-consumer] MODE=stream groupId=${GROUP_ID} fromBeginning=false`);


  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = bufToString(message.key);
      const value = bufToString(message.value);

      // ----- JSON Parsing -----
      if (!value) {
        console.error("[events-consumer] message.value is null/empty — skipping DB insert");
        return;
      }

      let jsonValue: unknown;
      try {
        jsonValue = JSON.parse(value);
      } catch (err) {
        console.error("[events-consumer] JSON.parse failed — skipping DB insert");
        console.error("[events-consumer] raw value:", value);
        console.error(err);
        return;
      }

      // ----- DB Insert -----
      try {
        const result = await pgPool.query(
          `
          INSERT INTO events_ingested (
            kafka_topic,
            kafka_partition,
            kafka_offset,
            kafka_timestamp_ms,
            message_key,
            message_value
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (kafka_topic, kafka_partition, kafka_offset) DO NOTHING
          `,
          [
            topic,
            partition,
            Number(message.offset),
            message.timestamp ? Number(message.timestamp) : null,
            key,
            jsonValue,
          ]
        );

        console.log(
          `[events-consumer] DB insert attempt → rowCount=${result.rowCount} (0 = duplicate)`
        );
      } catch (err) {
        console.error("[events-consumer] DB insert FAILED:");
        console.error(err);
      }

      // ----- Logging -----
      console.log(`[events-consumer] ${topic} p${partition} offset=${message.offset}`);

      console.log(
        JSON.stringify(
          {
            topic,
            partition,
            offset: message.offset,
            timestamp: message.timestamp,
            key,
            value,
          },
          null,
          2
        )
      );
    },
  });
}

main().catch((err) => {
  console.error("[events-consumer] Fatal error:", err);
  process.exit(1);
});

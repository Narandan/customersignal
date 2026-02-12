// src/lib/kafka.ts
import { Kafka, Producer } from "kafkajs";

let producer: Producer | null = null;

export async function initKafkaProducer(): Promise<void> {
  const kafka = new Kafka({
    clientId: "ingestion-service",
    brokers: ["localhost:9092"], // talks to your Docker Kafka
  });

  producer = kafka.producer();
  await producer.connect();
  console.log("[kafka] Producer connected to localhost:9092");
}

export function getKafkaProducer(): Producer {
  if (!producer) {
    throw new Error("Kafka producer has not been initialized");
  }
  return producer;
}

export async function shutdownKafkaProducer(): Promise<void> {
  if (!producer) return;
  try {
    await producer.disconnect();
    console.log("[kafka] Producer disconnected");
  } finally {
    producer = null;
  }
}


import { createServer } from "./server";
import { initKafkaProducer, shutdownKafkaProducer } from "./lib/kafka";

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    // 1️⃣ Connect to Kafka first
    await initKafkaProducer();

    const app = createServer();

    const server = app.listen(PORT, () => {
      console.log(`ingestion-service listening on port ${PORT}`);
    });

    // 2️⃣ Graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down...");
      server.close(async () => {
        await shutdownKafkaProducer();
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

  } catch (err) {
    console.error("Failed to start ingestion-service", err);
    process.exit(1);
  }
}

start();



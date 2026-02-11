import { createServer } from "./server";

const PORT = process.env.PORT || 4000;

const app = createServer();

app.listen(PORT, () => {
  console.log(`ingestion-service listening on port ${PORT}`);
});


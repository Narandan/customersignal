import { Client } from "pg";

async function main() {
  const client = new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "customersignal",
    user: process.env.PGUSER || "customersignal",
    password: process.env.PGPASSWORD || "devpassword",
  });

  await client.connect();
  const res = await client.query("SELECT 1 as ok;");
  console.log("[events-consumer] Postgres OK:", res.rows[0]);
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("[events-consumer] Postgres smoke test failed:", err);
  process.exit(1);
});

import fs from "fs";
import path from "path";
import { Client } from "pg";

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx ts-node src/run_sql.ts <path-to-sql>");
    process.exit(1);
  }

  const sqlPath = path.resolve(file);
  const sql = fs.readFileSync(sqlPath, "utf8");

  const client = new Client({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

  await client.connect();
  await client.query(sql);
  await client.end();

  console.log(`[events-consumer] Applied SQL: ${sqlPath}`);
}

main().catch((err) => {
  console.error("[events-consumer] SQL apply failed:", err);
  process.exit(1);
});

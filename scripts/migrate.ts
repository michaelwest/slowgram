import { readFile } from "node:fs/promises";
import path from "node:path";

import { pool } from "../src/lib/db";

async function main() {
  const migrationPath = path.join(process.cwd(), "src", "db", "migrations", "001_init.sql");
  const sql = await readFile(migrationPath, "utf8");
  await pool.query(sql);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

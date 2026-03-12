import { Pool, type PoolClient } from "pg";

import { getEnv } from "./env";

let cachedPool: Pool | null = null;

function getPool() {
  cachedPool ??= new Pool({
    connectionString: getEnv().DATABASE_URL
  });
  return cachedPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, property, receiver) {
    return Reflect.get(getPool(), property, receiver);
  }
});

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

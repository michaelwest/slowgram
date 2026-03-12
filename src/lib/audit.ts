import { pool } from "./db";

export async function writeAuditEvent(eventType: string, message: string, metadata: Record<string, unknown> = {}, level = "info") {
  await pool.query(
    `
      INSERT INTO audit_events (event_type, level, message, metadata)
      VALUES ($1, $2, $3, $4::jsonb)
    `,
    [eventType, level, message, JSON.stringify(metadata)]
  );
}

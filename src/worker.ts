import { bootstrapInstagramSession, collectLatestPosts, discoverFollowedAccounts } from "./lib/instagram";
import { sendDigestForDate } from "./lib/digests";
import { ensureAppDirectories } from "./lib/paths";
import { writeAuditEvent } from "./lib/audit";
import { pool } from "./lib/db";

async function main() {
  await ensureAppDirectories();
  const [, , command, ...flags] = process.argv;

  switch (command) {
    case "login":
      await bootstrapInstagramSession({ headed: flags.includes("--headed") });
      break;
    case "collect":
      await collectLatestPosts();
      break;
    case "discover":
      await discoverFollowedAccounts();
      break;
    case "digest":
      await sendDigestForDate();
      break;
    case "cron":
      await discoverFollowedAccounts().catch(() => undefined);
      await collectLatestPosts();
      await sendDigestForDate();
      break;
    default:
      console.log("Usage: npm run worker -- [login|collect|discover|digest|cron] [--headed]");
  }
}

main()
  .catch(async (error) => {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    await writeAuditEvent("worker.error", message, {}, "error").catch(() => undefined);
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });

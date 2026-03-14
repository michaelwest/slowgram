import { readFile } from "node:fs/promises";

import { decryptText } from "../src/lib/crypto";
import { getEnv } from "../src/lib/env";
import { playwrightStatePath } from "../src/lib/paths";

async function main() {
  const env = getEnv();
  const filePath = process.argv[2] ?? playwrightStatePath();
  const encrypted = await readFile(filePath, "utf8");
  const raw = decryptText(encrypted, env.LOGIN_SESSION_ENCRYPTION_KEY);
  console.log(raw);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

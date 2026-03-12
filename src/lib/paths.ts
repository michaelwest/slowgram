import { mkdir } from "node:fs/promises";
import path from "node:path";

import { getEnv } from "./env";

export async function ensureAppDirectories() {
  const env = getEnv();
  await mkdir(env.mediaRoot, { recursive: true });
  await mkdir(env.playwrightStateRoot, { recursive: true });
}

export function mediaAbsolutePath(localPath: string) {
  const env = getEnv();
  return path.join(env.mediaRoot, localPath);
}

export function mediaRelativePath(...segments: string[]) {
  return path.join(...segments);
}

export function playwrightStatePath(filename = "instagram-storage-state.json") {
  const env = getEnv();
  return path.join(env.playwrightStateRoot, filename);
}

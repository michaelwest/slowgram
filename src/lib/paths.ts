import { mkdir } from "node:fs/promises";
import path from "node:path";

import { env } from "./env";

export async function ensureAppDirectories() {
  await mkdir(env.mediaRoot, { recursive: true });
  await mkdir(env.playwrightStateRoot, { recursive: true });
}

export function mediaAbsolutePath(localPath: string) {
  return path.join(env.mediaRoot, localPath);
}

export function mediaRelativePath(...segments: string[]) {
  return path.join(...segments);
}

export function playwrightStatePath(filename = "instagram-storage-state.json") {
  return path.join(env.playwrightStateRoot, filename);
}

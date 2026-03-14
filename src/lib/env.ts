import "dotenv/config";

import path from "node:path";

import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_BASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  ALLOWED_EMAIL: z.string().email(),
  OPERATOR_PASSWORD: z.string().min(8).default("change-this-password"),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM: z.string().min(1).default("Slowgram <digest@example.com>"),
  MEDIA_ROOT: z.string().default("./data/media"),
  PLAYWRIGHT_STATE_ROOT: z.string().default("./data/playwright"),
  DIGEST_TIMEZONE: z.string().default("Australia/Sydney"),
  INSTAGRAM_USERNAME: z.string().optional(),
  INSTAGRAM_PASSWORD: z.string().optional(),
  LOGIN_SESSION_ENCRYPTION_KEY: z.string().min(32).default("replace-me-with-32-plus-chars")
});

let cachedEnv: ReturnType<typeof buildEnv> | null = null;

function buildEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }

  return {
    ...parsed.data,
    mediaRoot: path.resolve(parsed.data.MEDIA_ROOT),
    playwrightStateRoot: path.resolve(parsed.data.PLAYWRIGHT_STATE_ROOT)
  };
}

export function getEnv() {
  cachedEnv ??= buildEnv();
  return cachedEnv;
}

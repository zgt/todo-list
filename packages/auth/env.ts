import { createEnv } from "@t3-oss/env-core";
import { z } from "zod/v4";

export function authEnv() {
  return createEnv({
    server: {
      AUTH_DISCORD_ID: z.string().min(1),
      AUTH_DISCORD_SECRET: z.string().min(1),
      AUTH_APPLE_ID: z.string().min(1).optional(),
      AUTH_APPLE_SECRET: z.string().min(1).optional(),
      AUTH_APPLE_BUNDLE_ID: z.string().min(1).optional(),
      AUTH_GOOGLE_ID: z.string().min(1).optional(),
      AUTH_GOOGLE_SECRET: z.string().min(1).optional(),
      AUTH_SECRET:
        process.env.NODE_ENV === "production"
          ? z.string().min(1)
          : z.string().min(1).optional(),
      AUTH_REDIRECT_PROXY_URL: z.string().url().optional(),
      AUTH_TRACE: z.enum(["0", "1"]).optional(),
      AUTH_DEBUG_SESSION_EXPIRES_IN_SEC: z.string().optional(),
      AUTH_DEBUG_UPDATE_AGE_SEC: z.string().optional(),
      AUTH_DEBUG_COOKIE_CACHE_MAX_AGE_SEC: z.string().optional(),
      NODE_ENV: z.enum(["development", "production"]).optional(),
    },
    runtimeEnv: process.env,
    skipValidation:
      !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  });
}

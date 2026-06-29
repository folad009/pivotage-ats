import { z } from "zod";

/**
 * Validated environment variables for the Privotage Consulting ATS.
 * Import from `@/env` instead of reading `process.env` directly (AGENTS.md §14).
 */

/** `.env` placeholders are often empty strings; treat those as unset optional vars. */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}

const optionalString = z.preprocess(
  emptyToUndefined,
  z.string().min(1).optional(),
);

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().email().optional(),
);

const serverSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: optionalString,

  // Auth.js (NextAuth v5)
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: optionalUrl,
  NEXTAUTH_URL: optionalUrl,
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,

  // File storage (S3-compatible)
  S3_ENDPOINT: optionalUrl,
  S3_REGION: optionalString,
  S3_BUCKET: optionalString,
  S3_ACCESS_KEY_ID: optionalString,
  S3_SECRET_ACCESS_KEY: optionalString,

  // Email (Resend)
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalEmail,

  // Runtime
  APP_ENV: z.enum(["development", "production"]).default("development"),

  // Scheduled jobs (retention purge cron)
  CRON_SECRET: optionalString,
});

type ServerEnv = z.infer<typeof serverSchema>;

function parseEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return process.env as unknown as ServerEnv;
  }

  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return parsed.data;
}

export const env = parseEnv();

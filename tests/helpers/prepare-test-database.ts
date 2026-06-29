import { execSync } from "node:child_process";

/**
 * Resets integration/e2e database to a deterministic seeded state (AGENTS.md §13).
 * Uses TEST_DATABASE_URL when set, otherwise DATABASE_URL.
 */
export function prepareTestDatabase(): void {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.warn(
      "[test-db] No DATABASE_URL — integration/e2e DB setup skipped.",
    );
    return;
  }

  const directUrl = process.env.TEST_DIRECT_URL ?? process.env.DIRECT_URL ?? url;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: directUrl,
    SKIP_ENV_VALIDATION: "true",
  };

  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env,
  });
  execSync("pnpm exec tsx prisma/seed.ts", { stdio: "inherit", env });
}

import { createPrismaClient } from "@/lib/create-prisma-client";
import type { PrismaClient } from "@/lib/prisma";

/** True when a database URL is available for integration tests. */
export const hasTestDatabase = Boolean(
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
);

let client: PrismaClient | undefined;

/** Shared Prisma client for integration tests (node environment). */
export function getTestDb(): PrismaClient {
  if (!client) {
    client = createPrismaClient({
      connectionString:
        process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL,
    });
  }
  return client;
}

export async function disconnectTestDb(): Promise<void> {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}

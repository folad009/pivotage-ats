import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/lib/prisma";

type PrismaClientOptions = {
  connectionString?: string;
  log?: Prisma.LogLevel[] | Prisma.LogDefinition[];
};

function resolveConnectionString(connectionString?: string): string {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  return url;
}

function isAccelerateUrl(connectionString: string): boolean {
  return (
    connectionString.startsWith("prisma://") ||
    connectionString.startsWith("prisma+postgres://")
  );
}

/** Creates a Prisma Client instance for Prisma ORM 7 (adapter or Accelerate). */
export function createPrismaClient(options: PrismaClientOptions = {}): PrismaClient {
  const connectionString = resolveConnectionString(options.connectionString);

  if (isAccelerateUrl(connectionString)) {
    return new PrismaClient({
      accelerateUrl: connectionString,
      log: options.log,
    });
  }

  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: options.log,
  });
}

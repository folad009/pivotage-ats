import { Role } from "@/lib/prisma-browser";
import argon2 from "argon2";

import { createPrismaClient } from "@/lib/create-prisma-client";
import { parseBootstrapAdminEnv } from "@/lib/validations/bootstrap";

/**
 * Creates the first ADMIN user in production. Idempotent — skips when an admin
 * already exists. Never ships default credentials; set env vars at run time.
 *
 * Usage (once after first deploy):
 *   BOOTSTRAP_ADMIN_EMAIL=you@company.com \
 *   BOOTSTRAP_ADMIN_PASSWORD='...' \
 *   pnpm db:bootstrap-admin
 */
function readBootstrapInput() {
  try {
    return parseBootstrapAdminEnv(process.env);
  } catch {
    console.error(
      "Bootstrap failed — set required environment variables:\n" +
        "  BOOTSTRAP_ADMIN_EMAIL\n" +
        "  BOOTSTRAP_ADMIN_PASSWORD (min 12 chars)\n" +
        "Optional:\n" +
        "  BOOTSTRAP_ADMIN_NAME",
    );
    process.exit(1);
  }
}

async function main() {
  const input = readBootstrapInput();
  const prisma = createPrismaClient();

  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: Role.ADMIN, isActive: true },
      select: { id: true, email: true },
    });

    if (existingAdmin) {
      console.info(
        `Bootstrap skipped: active admin already exists (${existingAdmin.email}).`,
      );
      return;
    }

    const emailTaken = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (emailTaken) {
      console.error(
        `Bootstrap failed: a user with email ${input.email} already exists.`,
      );
      process.exit(1);
    }

    const passwordHash = await argon2.hash(input.password);

    const admin = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: Role.ADMIN,
        passwordHash,
        isActive: true,
      },
      select: { id: true, email: true, name: true },
    });

    await prisma.agencySettings.upsert({
      where: { id: "default" },
      create: { id: "default", retentionDays: 365 },
      update: {},
    });

    console.info(
      `Bootstrap complete: admin user created (${admin.email}). Sign in at /login.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});

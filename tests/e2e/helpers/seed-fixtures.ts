import { PrismaClient } from "@prisma/client";

import { loadProjectEnv } from "../../helpers/load-env";

loadProjectEnv();

/** Resolves a seeded application detail path visible to hiring managers. */
export async function getSeededApplicationDetailPath(): Promise<string> {
  const db = new PrismaClient();
  try {
    const interview = await db.interview.findFirst({
      where: {
        panel: { some: { role: "HIRING_MANAGER" } },
        application: { status: "ACTIVE" },
      },
      select: { applicationId: true },
    });

    if (!interview) {
      throw new Error("Seed data required: no HM-panel interview found.");
    }

    return `/applications/detail/${interview.applicationId}`;
  } finally {
    await db.$disconnect();
  }
}

import { NextResponse } from "next/server";

import { env } from "@/env";
import { db } from "@/server/db";
import { runRetentionPurge } from "@/server/services/compliance.service";

/** Scheduled retention purge — secured via CRON_SECRET (AGENTS.md §15). */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await db.user.findFirst({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  if (!admin) {
    return NextResponse.json(
      { error: "No active admin user for audit attribution" },
      { status: 503 },
    );
  }

  const result = await runRetentionPurge(db, admin.id, new Date());

  return NextResponse.json({
    ok: true,
    ...result,
    ranAt: new Date().toISOString(),
  });
}

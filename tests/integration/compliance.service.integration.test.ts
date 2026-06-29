// @vitest-environment node
import {
  ApplicationStatus,
  ComplianceEventType,
  PrismaClient,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/server/services/storage.service", () => ({
  isStorageConfigured: () => false,
  deleteStorageObjects: vi.fn(),
  deleteStorageObject: vi.fn(),
}));

import {
  archiveApplication,
  gdprEraseCandidate,
  restoreApplication,
  runRetentionPurge,
} from "@/server/services/compliance.service";
import { listApplications } from "@/server/services/application.service";

const db = new PrismaClient();
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("compliance integration", () => {
  let adminId: string;
  let applicationId: string;

  beforeAll(async () => {
    const admin = await db.user.findFirst({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });
    if (!admin) {
      throw new Error("Seed data required: no admin user found.");
    }
    adminId = admin.id;

    const application = await db.application.findFirst({
      where: { status: ApplicationStatus.ACTIVE },
      select: { id: true, candidateId: true },
    });
    if (!application) {
      throw new Error("Seed data required: no active application found.");
    }
    applicationId = application.id;
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("archives an application and excludes it from default list queries", async () => {
    await archiveApplication(
      db,
      { id: adminId, role: "ADMIN" },
      applicationId,
    );

    const archived = await db.application.findUnique({
      where: { id: applicationId },
    });
    expect(archived?.status).toBe(ApplicationStatus.ARCHIVED);
    expect(archived?.archivedAt).not.toBeNull();

    const listed = await listApplications(
      db,
      { id: adminId, role: "ADMIN" },
      { limit: 100 },
    );
    expect(listed.items.some((item) => item.id === applicationId)).toBe(false);

    const archivedList = await listApplications(
      db,
      { id: adminId, role: "ADMIN" },
      { limit: 100, status: ApplicationStatus.ARCHIVED },
    );
    expect(archivedList.items.some((item) => item.id === applicationId)).toBe(
      true,
    );
  });

  it("restores an archived application for admins", async () => {
    const result = await restoreApplication(
      db,
      { id: adminId, role: "ADMIN" },
      applicationId,
    );
    expect(result.applicationId).toBe(applicationId);

    const restored = await db.application.findUnique({
      where: { id: applicationId },
    });
    expect(restored?.status).not.toBe(ApplicationStatus.ARCHIVED);
    expect(restored?.archivedAt).toBeNull();
  });

  it("GDPR erasure anonymizes candidate PII and writes audit log", async () => {
    const dedicatedCandidate = await db.candidate.create({
      data: {
        firstName: "Erase",
        lastName: "Me",
        email: `erase-me-${Date.now()}@example.test`,
      },
    });

    const result = await gdprEraseCandidate(
      db,
      { id: adminId, role: "ADMIN" },
      dedicatedCandidate.id,
    );
    expect(result.alreadyAnonymized).toBe(false);

    const erased = await db.candidate.findUnique({
      where: { id: dedicatedCandidate.id },
    });
    expect(erased?.firstName).toBe("[Erased]");
    expect(erased?.email).toContain("@anonymized.local");
    expect(erased?.anonymizedAt).not.toBeNull();

    const audit = await db.complianceAuditLog.findFirst({
      where: {
        subjectId: dedicatedCandidate.id,
        eventType: ComplianceEventType.GDPR_ERASURE,
      },
    });
    expect(audit).not.toBeNull();
  });

  it("retention purge anonymizes candidates with expired archived applications", async () => {
    const candidate = await db.candidate.create({
      data: {
        firstName: "Retention",
        lastName: "Target",
        email: `retention-${Date.now()}@example.test`,
      },
    });

    const job = await db.job.findFirst({ select: { id: true, ownerId: true } });
    if (!job) throw new Error("Seed job required");

    const stage = await db.pipelineStage.findFirst({
      where: { jobId: job.id },
      select: { id: true },
    });
    if (!stage) throw new Error("Seed stage required");

    const application = await db.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        currentStageId: stage.id,
        ownerId: job.ownerId,
        status: ApplicationStatus.ARCHIVED,
        archivedAt: new Date("2020-01-01"),
      },
    });

    const purge = await runRetentionPurge(
      db,
      adminId,
      new Date("2025-01-01"),
    );
    expect(purge.processed).toBeGreaterThanOrEqual(1);

    const anonymized = await db.candidate.findUnique({
      where: { id: candidate.id },
    });
    expect(anonymized?.anonymizedAt).not.toBeNull();

    const audit = await db.complianceAuditLog.findFirst({
      where: {
        subjectId: candidate.id,
        eventType: ComplianceEventType.RETENTION_PURGE,
      },
    });
    expect(audit).not.toBeNull();

    await db.application.delete({ where: { id: application.id } });
    await db.candidate.delete({ where: { id: candidate.id } });
  });
});

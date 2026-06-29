-- CreateEnum
CREATE TYPE "ComplianceEventType" AS ENUM ('GDPR_ERASURE', 'RETENTION_PURGE');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "anonymizedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AgencySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "AgencySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceAuditLog" (
    "id" TEXT NOT NULL,
    "eventType" "ComplianceEventType" NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ComplianceAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencySettings_updatedById_idx" ON "AgencySettings"("updatedById");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_eventType_idx" ON "ComplianceAuditLog"("eventType");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_performedAt_idx" ON "ComplianceAuditLog"("performedAt");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_subjectId_idx" ON "ComplianceAuditLog"("subjectId");

-- CreateIndex
CREATE INDEX "ComplianceAuditLog_performedById_idx" ON "ComplianceAuditLog"("performedById");

-- CreateIndex
CREATE INDEX "Candidate_anonymizedAt_idx" ON "Candidate"("anonymizedAt");

-- AddForeignKey
ALTER TABLE "AgencySettings" ADD CONSTRAINT "AgencySettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceAuditLog" ADD CONSTRAINT "ComplianceAuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "WorkMode" AS ENUM ('REMOTE', 'HYBRID', 'ONSITE');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "workMode" "WorkMode" NOT NULL DEFAULT 'REMOTE',
ADD COLUMN "jobRole" TEXT,
ADD COLUMN "requirements" TEXT,
ALTER COLUMN "clientId" DROP NOT NULL;

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_clientId_fkey";

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Job_workMode_idx" ON "Job"("workMode");

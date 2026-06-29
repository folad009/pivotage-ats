import {
  ApplicationStatus,
  JobStatus,
  type Prisma,
  type PrismaClient,
  type StageType,
} from "@prisma/client";

import {
  computeFunnelCounts,
  computeStageConversions,
  computeTimeToHireStats,
  computeTimeToHireTrend,
  type HireDurationInput,
} from "@/lib/reporting-calculations";
import type { AccessUser } from "@/lib/rbac";
import type { ReportFilters } from "@/lib/validations/report";
import { jobScopeWhere } from "@/server/services/job.service";

type Db = PrismaClient | Prisma.TransactionClient;

export function buildReportJobWhere(
  actor: AccessUser,
  filters: Pick<ReportFilters, "clientId" | "jobId">,
): Prisma.JobWhereInput {
  const clauses: Prisma.JobWhereInput[] = [];

  if (filters.clientId) clauses.push({ clientId: filters.clientId });
  if (filters.jobId) clauses.push({ id: filters.jobId });

  const scope = jobScopeWhere(actor);
  if (scope) clauses.push(scope);

  return clauses.length > 0 ? { AND: clauses } : {};
}

export function buildReportApplicationWhere(
  actor: AccessUser,
  filters: ReportFilters,
): Prisma.ApplicationWhereInput {
  const clauses: Prisma.ApplicationWhereInput[] = [
    {
      appliedAt: {
        gte: filters.from,
        lte: filters.to,
      },
    },
    { job: buildReportJobWhere(actor, filters) },
  ];

  if (!filters.includeArchived) {
    clauses.push({ status: { not: ApplicationStatus.ARCHIVED } });
  }

  return { AND: clauses };
}

async function fetchHireDurations(
  db: Db,
  applicationWhere: Prisma.ApplicationWhereInput,
): Promise<HireDurationInput[]> {
  const applications = await db.application.findMany({
    where: {
      ...applicationWhere,
      status: ApplicationStatus.HIRED,
    },
    select: {
      id: true,
      appliedAt: true,
      stageHistory: {
        where: { toStage: { type: "HIRED" } },
        orderBy: { movedAt: "asc" },
        take: 1,
        select: { movedAt: true },
      },
    },
  });

  const hires: HireDurationInput[] = [];
  for (const application of applications) {
    const hiredEntry = application.stageHistory[0];
    if (!hiredEntry) continue;
    hires.push({
      applicationId: application.id,
      appliedAt: application.appliedAt,
      hiredAt: hiredEntry.movedAt,
    });
  }

  return hires;
}

export async function getPipelineFunnel(
  db: Db,
  actor: AccessUser,
  filters: ReportFilters,
) {
  const applicationWhere = buildReportApplicationWhere(actor, filters);

  const applications = await db.application.findMany({
    where: applicationWhere,
    select: {
      currentStage: { select: { name: true, type: true } },
    },
  });

  const funnel = computeFunnelCounts(
    applications.map((application) => ({
      stageType: application.currentStage.type,
      stageName: application.currentStage.name,
    })),
  );

  return {
    totalApplications: applications.length,
    stages: funnel,
  };
}

export async function getTimeToHireMetrics(
  db: Db,
  actor: AccessUser,
  filters: ReportFilters,
) {
  const applicationWhere = buildReportApplicationWhere(actor, filters);
  const hires = await fetchHireDurations(db, applicationWhere);

  return {
    summary: computeTimeToHireStats(hires),
    trend: computeTimeToHireTrend(hires),
  };
}

export async function getConversionRates(
  db: Db,
  actor: AccessUser,
  filters: ReportFilters,
) {
  const applicationWhere = buildReportApplicationWhere(actor, filters);

  const applications = await db.application.findMany({
    where: applicationWhere,
    select: {
      id: true,
      stageHistory: {
        select: {
          toStage: { select: { type: true } },
        },
      },
    },
  });

  const reachedByApplication = new Map<string, Set<StageType>>();
  for (const application of applications) {
    const reached = new Set<StageType>();
    for (const entry of application.stageHistory) {
      reached.add(entry.toStage.type);
    }
    reachedByApplication.set(application.id, reached);
  }

  return {
    totalApplications: applications.length,
    conversions: computeStageConversions(reachedByApplication),
  };
}

export async function getJobStatusSummary(
  db: Db,
  actor: AccessUser,
  filters: Pick<ReportFilters, "clientId" | "jobId">,
) {
  const jobWhere = buildReportJobWhere(actor, filters);

  const [open, filled, onHold, closed] = await Promise.all([
    db.job.count({ where: { ...jobWhere, status: JobStatus.OPEN } }),
    db.job.count({ where: { ...jobWhere, status: JobStatus.FILLED } }),
    db.job.count({ where: { ...jobWhere, status: JobStatus.ON_HOLD } }),
    db.job.count({ where: { ...jobWhere, status: JobStatus.CLOSED } }),
  ]);

  return { open, filled, onHold, closed, total: open + filled + onHold + closed };
}

export async function getRecruiterActivity(
  db: Db,
  actor: AccessUser,
  filters: ReportFilters,
) {
  const applicationWhere = buildReportApplicationWhere(actor, filters);
  const jobWhere = buildReportJobWhere(actor, filters);

  const [applications, stageMoves, notes] = await Promise.all([
    db.application.findMany({
      where: applicationWhere,
      select: {
        ownerId: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
    db.stageHistory.findMany({
      where: {
        movedAt: { gte: filters.from, lte: filters.to },
        application: { job: jobWhere },
      },
      select: {
        movedById: true,
        movedBy: { select: { id: true, name: true, email: true } },
      },
    }),
    db.note.findMany({
      where: {
        type: "NOTE",
        createdAt: { gte: filters.from, lte: filters.to },
        application: { job: jobWhere },
      },
      select: {
        authorId: true,
        author: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  type ActivityRow = {
    userId: string;
    name: string | null;
    email: string;
    applicationsCreated: number;
    stageMoves: number;
    notesAdded: number;
  };

  const byUser = new Map<string, ActivityRow>();

  function ensureUser(user: {
    id: string;
    name: string | null;
    email: string;
  }): ActivityRow {
    const existing = byUser.get(user.id);
    if (existing) return existing;
    const row: ActivityRow = {
      userId: user.id,
      name: user.name,
      email: user.email,
      applicationsCreated: 0,
      stageMoves: 0,
      notesAdded: 0,
    };
    byUser.set(user.id, row);
    return row;
  }

  for (const application of applications) {
    ensureUser(application.owner).applicationsCreated += 1;
  }
  for (const move of stageMoves) {
    ensureUser(move.movedBy).stageMoves += 1;
  }
  for (const note of notes) {
    ensureUser(note.author).notesAdded += 1;
  }

  const rows = [...byUser.values()].sort(
    (a, b) =>
      b.applicationsCreated +
      b.stageMoves +
      b.notesAdded -
      (a.applicationsCreated + a.stageMoves + a.notesAdded),
  );

  return { recruiters: rows };
}

export async function getReportsOverview(
  db: Db,
  actor: AccessUser,
  filters: ReportFilters,
) {
  const [funnel, timeToHire, conversions, jobStatus, recruiterActivity] =
    await Promise.all([
      getPipelineFunnel(db, actor, filters),
      getTimeToHireMetrics(db, actor, filters),
      getConversionRates(db, actor, filters),
      getJobStatusSummary(db, actor, filters),
      getRecruiterActivity(db, actor, filters),
    ]);

  return {
    funnel,
    timeToHire,
    conversions,
    jobStatus,
    recruiterActivity,
  };
}

export {
  computeFunnelCounts,
  computeMedian,
  computeStageConversions,
  computeTimeToHireStats,
  computeTimeToHireTrend,
  daysBetween,
} from "@/lib/reporting-calculations";

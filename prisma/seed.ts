import argon2 from "argon2";

import { createPrismaClient } from "../src/lib/create-prisma-client";

const prisma = createPrismaClient();

/** Default pipeline stages applied to every seeded job (AGENTS.md §6). */
const DEFAULT_STAGES = [
  { name: "Sourced", type: "SOURCED" },
  { name: "Screening", type: "SCREENING" },
  { name: "Phone Interview", type: "INTERVIEW" },
  { name: "Onsite", type: "INTERVIEW" },
  { name: "Offer", type: "OFFER" },
  { name: "Hired", type: "HIRED" },
  { name: "Rejected", type: "REJECTED" },
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

async function resetDomainData() {
  // Delete in FK-safe order so the seed is idempotent.
  await prisma.complianceAuditLog.deleteMany();
  await prisma.stageHistory.deleteMany();
  await prisma.scorecard.deleteMany();
  await prisma.note.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.application.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.job.deleteMany();
  await prisma.client.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agencySettings.deleteMany();
}

async function main() {
  if (
    process.env.APP_ENV === "production" &&
    process.env.ALLOW_DEV_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run dev seed in production. Use `pnpm db:bootstrap-admin` for the first admin user.",
    );
  }

  await resetDomainData();

  const passwordHash = await argon2.hash("Password123!");

  await prisma.user.create({
    data: {
      name: "Ada Admin",
      email: "admin@privotage.test",
      role: "ADMIN",
      passwordHash,
    },
  });

  await prisma.agencySettings.create({
    data: { id: "default", retentionDays: 365 },
  });

  const recruiter = await prisma.user.create({
    data: {
      name: "Riley Recruiter",
      email: "recruiter@privotage.test",
      role: "RECRUITER",
      passwordHash,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Morgan Manager",
      email: "manager@privotage.test",
      role: "HIRING_MANAGER",
      passwordHash,
    },
  });

  const acme = await prisma.client.create({
    data: {
      name: "Acme Corporation",
      contactEmail: "talent@acme.test",
      industry: "Manufacturing",
      status: "ACTIVE",
    },
  });

  const globex = await prisma.client.create({
    data: {
      name: "Globex Inc",
      contactEmail: "people@globex.test",
      industry: "Software",
      status: "ACTIVE",
    },
  });

  const jobSpecs = [
    {
      title: "Senior Frontend Engineer",
      clientId: globex.id,
      department: "Engineering",
      location: "Remote",
      employmentType: "FULL_TIME" as const,
      workMode: "REMOTE" as const,
      jobRole: "Frontend Engineer",
      status: "OPEN" as const,
      openings: 2,
      description:
        "Build accessible, performant web applications for client products.",
      requirements:
        "5+ years React/TypeScript experience. Strong CSS and testing skills.",
    },
    {
      title: "Product Designer",
      clientId: globex.id,
      department: "Design",
      location: "London, UK",
      employmentType: "FULL_TIME" as const,
      workMode: "HYBRID" as const,
      jobRole: "Product Designer",
      status: "OPEN" as const,
      openings: 1,
      description: "Own end-to-end design for recruitment workflows.",
      requirements: "Portfolio demonstrating B2B SaaS product design.",
    },
    {
      title: "Operations Coordinator",
      clientId: acme.id,
      department: "Operations",
      location: "Manchester, UK",
      employmentType: "FULL_TIME" as const,
      workMode: "ONSITE" as const,
      jobRole: "Operations Coordinator",
      status: "DRAFT" as const,
      openings: 1,
      description: "Support day-to-day hiring operations for Acme.",
      requirements: "Organised communicator with ATS or HR admin experience.",
    },
    {
      title: "Internal Talent Partner",
      clientId: null,
      department: "People",
      location: "Remote",
      employmentType: "FULL_TIME" as const,
      workMode: "REMOTE" as const,
      jobRole: "Talent Partner",
      status: "OPEN" as const,
      openings: 1,
      description: "In-house recruiter supporting Privotage Consulting growth.",
      requirements: "Agency or in-house recruiting background.",
    },
  ];

  const jobs = [];
  for (const spec of jobSpecs) {
    const job = await prisma.job.create({
      data: {
        ...spec,
        ownerId: recruiter.id,
        stages: {
          create: DEFAULT_STAGES.map((stage, index) => ({
            name: stage.name,
            type: stage.type,
            order: index,
          })),
        },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });
    jobs.push(job);
  }

  const candidateSpecs = [
    { firstName: "Olivia", lastName: "Bennett", source: "LinkedIn" },
    { firstName: "Liam", lastName: "Carter", source: "Referral" },
    { firstName: "Emma", lastName: "Davies", source: "Job Board" },
    { firstName: "Noah", lastName: "Evans", source: "LinkedIn" },
    { firstName: "Ava", lastName: "Foster", source: "Agency" },
    { firstName: "William", lastName: "Green", source: "Referral" },
    { firstName: "Sophia", lastName: "Hughes", source: "Job Board" },
    { firstName: "James", lastName: "Ivanov", source: "LinkedIn" },
    { firstName: "Isabella", lastName: "Jones", source: "Career Fair" },
    { firstName: "Benjamin", lastName: "King", source: "Referral" },
    { firstName: "Mia", lastName: "Lewis", source: "Job Board" },
    { firstName: "Lucas", lastName: "Morgan", source: "LinkedIn" },
  ];

  const candidates = [];
  for (const spec of candidateSpecs) {
    const candidate = await prisma.candidate.create({
      data: {
        firstName: spec.firstName,
        lastName: spec.lastName,
        email: `${spec.firstName}.${spec.lastName}@example.test`.toLowerCase(),
        phone: "+44 20 7946 0000",
        location: "United Kingdom",
        source: spec.source,
        linkedinUrl: `https://www.linkedin.com/in/${spec.firstName}-${spec.lastName}`.toLowerCase(),
      },
    });
    candidates.push(candidate);
  }

  const candidateA = candidates[0];
  if (candidateA) {
    await prisma.tag.create({
      data: {
        name: "Top Prospect",
        color: "#16a34a",
        candidates: { connect: { id: candidateA.id } },
      },
    });
  }

  // Spread applications across stages, each with a matching StageHistory trail.
  // "progression" = the linear happy-path stages (Sourced → … → Hired).
  type SeededStage = (typeof jobs)[number]["stages"][number];

  let applicationCount = 0;
  let interviewCount = 0;
  let scorecardCount = 0;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const job = jobs[i % jobs.length];
    if (!candidate || !job) continue;

    const progression = job.stages
      .filter((s: SeededStage) => s.type !== "REJECTED")
      .sort((a: SeededStage, b: SeededStage) => a.order - b.order);
    const rejectedStage = job.stages.find((s: SeededStage) => s.type === "REJECTED");

    // Cycle through outcomes: positions 0..5 along progression, plus rejected.
    const outcome = i % 7;
    const isRejected = outcome === 6;

    let visitingStages: SeededStage[];
    if (isRejected && rejectedStage) {
      const firstTwo = progression.slice(0, 2);
      visitingStages = [...firstTwo, rejectedStage];
    } else {
      const targetIndex = Math.min(outcome, progression.length - 1);
      visitingStages = progression.slice(0, targetIndex + 1);
    }

    const currentStage = visitingStages[visitingStages.length - 1];
    if (!currentStage) continue;

    const status = isRejected
      ? "REJECTED"
      : currentStage.type === "HIRED"
        ? "HIRED"
        : "ACTIVE";

    const appliedAt = daysAgo(30 - i);

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobId: job.id,
        ownerId: recruiter.id,
        currentStageId: currentStage.id,
        status,
        rating: status === "ACTIVE" ? ((i % 5) + 1) : null,
        appliedAt,
        archivedAt: null,
      },
    });
    applicationCount++;

    // StageHistory: walk every visited stage (null → Sourced → … → current).
    let previous: SeededStage | null = null;
    for (let step = 0; step < visitingStages.length; step++) {
      const stage = visitingStages[step];
      if (!stage) continue;
      const isLast = step === visitingStages.length - 1;
      await prisma.stageHistory.create({
        data: {
          applicationId: application.id,
          fromStageId: previous?.id ?? null,
          toStageId: stage.id,
          movedById: recruiter.id,
          movedAt: new Date(appliedAt.getTime() + step * 2 * DAY_MS),
          reason:
            isRejected && isLast
              ? "Not a fit after screening."
              : undefined,
        },
      });
      previous = stage;
    }

    // Add an interview (+ scorecard) once a candidate reaches an interview stage.
    const reachedInterview = visitingStages.some(
      (s) => s.type === "INTERVIEW",
    );
    if (reachedInterview && !isRejected) {
      const interview = await prisma.interview.create({
        data: {
          applicationId: application.id,
          type: currentStage.type === "INTERVIEW" ? "TECHNICAL" : "FINAL",
          status:
            currentStage.type === "INTERVIEW" ? "SCHEDULED" : "COMPLETED",
          scheduledAt: new Date(appliedAt.getTime() + 5 * DAY_MS),
          durationMins: 60,
          meetingUrl: "https://meet.privotage.test/" + application.id,
          panel: { connect: [{ id: manager.id }, { id: recruiter.id }] },
        },
      });
      interviewCount++;

      if (interview.status === "COMPLETED") {
        await prisma.scorecard.create({
          data: {
            interviewId: interview.id,
            authorId: manager.id,
            overall: (i % 3) + 3,
            recommendation: status === "HIRED" ? "STRONG_YES" : "YES",
            criteria: {
              communication: (i % 3) + 3,
              technical: (i % 2) + 4,
              culture: 4,
            },
            comments: "Solid interview performance.",
          },
        });
        scorecardCount++;
      }
    }

    // A note on the first few applications.
    if (i < 4) {
      await prisma.note.create({
        data: {
          applicationId: application.id,
          authorId: recruiter.id,
          body: `Initial review for ${candidate.firstName} ${candidate.lastName}.`,
          type: "NOTE",
        },
      });
    }
  }

  console.log("Seed complete:");
  console.log(`  users:        3 (admin, recruiter, hiring manager)`);
  console.log(`  clients:      2`);
  console.log(`  jobs:         ${jobs.length} (7 stages each)`);
  console.log(`  candidates:   ${candidates.length}`);
  console.log(`  applications: ${applicationCount}`);
  console.log(`  interviews:   ${interviewCount}`);
  console.log(`  scorecards:   ${scorecardCount}`);
}

void main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });

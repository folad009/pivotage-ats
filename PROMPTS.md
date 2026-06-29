# PROMPTS.md — AI Agent Prompt Library (Privotage Consulting ATS)

A phased, copy-paste library of prompts to drive an AI coding agent through the full build of
the ATS. Use them **in order** (Phase 0 → 12); each phase builds on the previous one.

## How to use this library
1. Make sure `AGENTS.md` exists at the repo root — every prompt assumes the agent reads it.
2. Copy one phase prompt at a time into your agent. Don't paste multiple phases at once.
3. Review, run the acceptance checks, commit, then move to the next phase.
4. Use the **Meta-Prompts** at the bottom for recurring tasks (bugfix, review, refactor, tests).

**Standing instruction to prepend to any prompt (optional but recommended):**
> Read `AGENTS.md` first and follow it strictly: RSC-first, services hold business logic,
> actions/procedures stay thin and always validate (Zod) + authorize (RBAC) server-side, follow
> the Prisma conventions, and satisfy the Definition of Done. Ask me before introducing any
> dependency or pattern not described in `AGENTS.md`. Make minimal, focused changes and explain
> trade-offs.

---

## Phase 0 — Project Scaffold

```text
Read AGENTS.md, then scaffold the project foundation for the Privotage Consulting ATS.

Goal: a runnable Next.js 15 (App Router) + TypeScript app with tooling configured, no features yet.

Tasks:
1. Initialize a Next.js 15 App Router project with TypeScript, ESLint, Tailwind CSS, and the `@/` import alias.
2. Configure TypeScript strict mode plus noUncheckedIndexedAccess, noUnusedLocals, noUnusedParameters.
3. Set up Prettier + ESLint (TypeScript) including @typescript-eslint/no-floating-promises and no-explicit-any as errors.
4. Initialize shadcn/ui (slate base, dark mode via class strategy) and add: button, input, dropdown-menu, dialog, table, card, badge, sonner (toast), form, select, avatar, tabs, skeleton.
5. Install core deps: prisma, @prisma/client, zod, react-hook-form, @hookform/resolvers, @tanstack/react-query, @tanstack/react-table, @trpc/server, @trpc/client, @trpc/react-query, superjson, dnd-kit, next-auth@beta, argon2, date-fns.
6. Create the directory structure from AGENTS.md §4 (empty placeholder files where helpful).
7. Add a Zod-validated `src/env.ts` and a `.env.example` covering all vars in AGENTS.md §14.
8. Add pnpm scripts: dev, build, start, lint, typecheck, test, test:e2e, db:seed.
9. Create a Prisma client singleton at `src/server/db.ts`.

Acceptance criteria:
- `pnpm dev` runs and shows a placeholder home page.
- `pnpm lint` and `pnpm typecheck` pass.
- Directory structure matches AGENTS.md §4.
- `.env.example` documents every required variable.

Do not implement any domain features yet. Do not commit.
```

---

## Phase 1 — Database Schema, Migrations & Seed

```text
Read AGENTS.md (§5 Domain Model, §9 Prisma conventions). Implement the Prisma schema.

Goal: a complete, migrated PostgreSQL schema with a dev seed.

Tasks:
1. In `prisma/schema.prisma`, model: User, Client, Job, PipelineStage, Candidate, Application,
   StageHistory, Interview, Scorecard, Note, Attachment, Tag (and the Auth.js adapter models:
   Account, Session, VerificationToken).
2. Add enums: Role (ADMIN, RECRUITER, HIRING_MANAGER), JobStatus, ApplicationStatus, StageType,
   InterviewType, InterviewStatus, Recommendation, NoteType.
3. Follow every Prisma convention in AGENTS.md §9: cuid ids; createdAt/updatedAt; both-sided
   relations with @relation; index all FKs and hot filter fields; @@unique on Candidate.email
   and on [candidateId, jobId] in Application; soft-archive via status/archivedAt.
4. Create the initial migration (`prisma migrate dev`).
5. Write `prisma/seed.ts`: one admin, one recruiter, one hiring manager (argon2-hashed passwords),
   2 clients, 3 jobs with default pipeline stages (Sourced, Screening, Phone Interview, Onsite,
   Offer, Hired, Rejected), ~12 candidates, and several applications spread across stages with
   matching StageHistory rows.

Acceptance criteria:
- Migration applies cleanly; `pnpm prisma generate` succeeds.
- `pnpm db:seed` populates a coherent dataset (visible in `prisma studio`).
- Schema passes `prisma validate` and matches AGENTS.md §5/§9.

Explain any modeling trade-offs. Do not commit.
```

---

## Phase 2 — Authentication & RBAC

```text
Read AGENTS.md (§7 RBAC, §10 Auth). Implement authentication and authorization.

Goal: working login with role-based access enforced on the server.

Tasks:
1. Configure Auth.js (NextAuth v5) in `src/server/auth.ts` with the Prisma adapter and a
   Credentials provider (email + argon2 password verification). Include `role` in session.
2. Create `app/api/auth/[...nextauth]/route.ts` and a login page under `(auth)/login` using
   react-hook-form + Zod + shadcn form.
3. Add `middleware.ts` protecting the `(dashboard)` group (redirect to /login when unauthenticated).
4. Implement `src/lib/rbac.ts` with `can(user, action, resource?)` and a `Permission` model that
   encodes the AGENTS.md §7 matrix, plus `getCurrentUser()` (throws if unauthenticated) and
   `requireRole()/requirePermission()` helpers for actions/procedures.
5. Add unit tests (Vitest) covering the full RBAC matrix for all three roles.

Acceptance criteria:
- Seeded users can log in; wrong credentials are rejected.
- Visiting a dashboard route while logged out redirects to /login.
- `can()` returns correct results for every cell in the §7 matrix (tests pass).
- No authorization logic lives only in the UI.

Do not commit.
```

---

## Phase 3 — App Shell & tRPC Wiring

```text
Read AGENTS.md (§3 Architecture, §4 structure, §12 UI/UX). Build the authenticated app shell and
wire up tRPC.

Goal: a role-aware dashboard layout with navigation and end-to-end typed data access.

Tasks:
1. Initialize tRPC: `src/server/trpc/trpc.ts` (context with session + db), root router, a
   `protectedProcedure` that enforces auth, and the React Query provider + `app/api/trpc/[trpc]`.
2. Provide a server-side tRPC caller for RSC initial fetches.
3. Build the `(dashboard)` layout: responsive left sidebar (role-aware links: Jobs, Candidates,
   Applications, Interviews, Clients, Reports, Settings), top bar with user menu + sign out +
   global search placeholder, and dark-mode toggle.
4. Add a `/dashboard` landing page with placeholder metric cards.
5. Establish shared UI states: Skeletons, EmptyState, ErrorState components in `components/ui`.

Acceptance criteria:
- Logged-in users see the shell; nav items hide/show based on role per §7.
- A trivial tRPC query (e.g. `me`) works from both a client component and an RSC server caller.
- Layout is responsive and accessible (keyboard nav, focus states).

Do not commit.
```

---

## Phase 4 — Clients & Jobs Module

```text
Read AGENTS.md (§5, §6, §7, §9, §11). Implement the Clients and Jobs modules.

Goal: recruiters/admins can manage clients and job requisitions end to end.

Tasks:
1. Zod schemas in `src/lib/validations/client.ts` and `job.ts`.
2. Service layer: `services/client.service.ts`, `services/job.service.ts` (CRUD + list with
   pagination/filter; creating a Job seeds its default PipelineStages).
3. tRPC routers (queries: list/get with cursor pagination + filters) and Server Actions
   (create/update/close job, manage client) — all validate (Zod) + authorize (RBAC).
4. UI: Clients list + detail; Jobs list (TanStack Table: status, client, owner, openings filters)
   + Job detail page with editable pipeline stage configuration (reorder via dnd-kit).
5. Enforce §7: hiring managers see only assigned jobs (read-only).

Acceptance criteria:
- Create/edit/close a job and create/edit a client through the UI.
- Job creation auto-creates default pipeline stages; stages are reorderable.
- Lists paginate and filter; permissions match §7 (verify as each role).
- Unit tests for job/client services; loading/empty/error states present.

Do not commit.
```

---

## Phase 5 — Candidates Module

```text
Read AGENTS.md (§5, §7, §9, §11, §15). Implement the Candidates module with resume upload.

Goal: manage candidate records (PII) and attached resumes safely.

Tasks:
1. Zod schema `validations/candidate.ts` (normalize email lowercase, trim).
2. `services/candidate.service.ts`: CRUD, paginated search (name/email/tag), and **dedupe**
   (reject/merge on duplicate email — surface a clear conflict).
3. File upload via S3-compatible storage using presigned URLs: an action to request an upload
   URL (validate mime type + size server-side), store an Attachment row with a random storage key,
   and serve downloads via short-lived presigned URLs. Never trust client metadata.
4. tRPC queries + Server Actions (validate + authorize). Restrict PII per §7/§15.
5. UI: Candidates list (TanStack Table, search, tags), Candidate detail (profile, attachments,
   linked applications), create/edit form with resume upload + drag-drop.

Acceptance criteria:
- Create/edit a candidate; upload and download a resume via presigned URLs.
- Duplicate email is prevented with a clear message.
- Hiring managers cannot browse all PII (only assigned-job candidates) — verified.
- Service unit tests incl. dedupe; upload validates type/size server-side.

Do not commit.
```

---

## Phase 6 — Applications & Kanban Pipeline

```text
Read AGENTS.md (§5, §6 lifecycle rules, §7, §9, §13). Implement the core Applications module and
the kanban pipeline. THIS IS THE HEART OF THE APP.

Goal: create applications and move them through a job's pipeline with a full audit trail.

Tasks:
1. Zod schema `validations/application.ts`.
2. `services/application.service.ts`:
   - `createApplication` (enforce @@unique candidate+job; set initial stage).
   - `moveStage` — wrap in `prisma.$transaction`: update currentStageId, insert StageHistory
     (from, to, movedById, reason?), and append a SYSTEM Note. Moving to HIRED sets status=HIRED
     (and prompts job close if openings filled); moving to REJECTED sets status=REJECTED and
     REQUIRES a reason. Never mutate currentStageId outside this service.
   - List/get with filters; stage transition validation lives here.
3. tRPC queries (board data grouped by stage; application detail) + Server Actions (create, move,
   reject, withdraw) — validate + authorize per §7 (hiring managers only on assigned jobs).
4. UI: per-job **Kanban board** (dnd-kit) with columns = pipeline stages; drag a card to move
   stage with **optimistic update** + rollback on error; reject requires a reason dialog.
   Application detail view: timeline (StageHistory), notes, interviews, attachments, scorecards.
5. Tests: integration test proving moveStage writes StageHistory + Note atomically; unit tests
   for transition rules (reject requires reason, hire updates status).

Acceptance criteria:
- Drag-and-drop moves persist and create StageHistory; UI updates optimistically and rolls back
  on failure.
- Rejecting without a reason is blocked; hiring sets status correctly.
- Duplicate application (same candidate+job) is prevented.
- The golden path (create → move through stages) works for recruiter and is correctly limited
  for hiring manager.

Do not commit.
```

---

## Phase 7 — Interviews & Scorecards

```text
Read AGENTS.md (§5, §7, §11, §15). Implement interview scheduling and scorecards.

Goal: schedule interviews on an application and capture structured interviewer feedback.

Tasks:
1. Zod schemas `validations/interview.ts` and `scorecard.ts`.
2. `services/interview.service.ts`: schedule/reschedule/cancel; assign a panel (Users); on
   schedule, send an email invite via the email provider (Resend/SMTP). `services/scorecard.service.ts`:
   create/update a scorecard (overall rating, recommendation enum, JSON criteria, comments).
3. tRPC + Server Actions (validate + authorize): recruiters/admins schedule; panel members
   (incl. hiring managers) submit scorecards for their interviews only.
4. UI: schedule-interview dialog on the application detail (type, datetime, duration, location/link,
   panel); interviews list/calendar-ish view; scorecard form for assigned interviewers; aggregate
   scorecard summary on the application.
5. Tests: scheduling creates the record + invite; scorecard authorization (only panel members).

Acceptance criteria:
- Schedule an interview, assign a panel, and (mock) send an invite.
- A hiring manager on the panel can submit a scorecard; a non-panel user cannot.
- Application detail shows interviews + aggregated scorecard recommendation.

Do not commit.
```

---

## Phase 8 — Notes & Activity Feed

```text
Read AGENTS.md (§5, §7, §15). Implement notes and a unified activity feed.

Goal: collaborate on applications with notes/@mentions and a chronological activity timeline.

Tasks:
1. `services/note.service.ts`: add NOTE-type notes with @mention parsing (link to Users);
   SYSTEM notes are produced by other services (stage moves, scheduling) — do not allow clients
   to create SYSTEM notes.
2. tRPC query for a merged, paginated activity feed per application (StageHistory + Notes +
   Interview events) ordered by time. Server Action to add a note (validate + authorize).
3. UI: activity feed component on the application detail (distinguish system vs user notes),
   composer with @mention autocomplete, optimistic append.
4. (Optional) Notify mentioned users by email.

Acceptance criteria:
- Any permitted user can add a note; @mentions resolve to users.
- The feed merges system + user events chronologically and paginates.
- Clients cannot forge SYSTEM notes (server rejects).

Do not commit.
```

---

## Phase 9 — Dashboard & Reporting

```text
Read AGENTS.md (§6, §7, §9 query rules, no Date.now in cached queries). Build reporting.

Goal: actionable hiring metrics for recruiters/admins.

Tasks:
1. `services/reporting.service.ts`: compute pipeline **funnel** (count per stage), **time-to-hire**
   (avg/median from appliedAt to HIRED via StageHistory), **conversion rates** between stages,
   open vs filled jobs, and recruiter activity. Accept a date range as an argument (do not read
   "now" inside cached queries).
2. tRPC queries for each metric with role scoping (hiring managers → assigned jobs).
3. UI dashboard: metric cards + charts (funnel, time-to-hire trend) using a lightweight chart lib
   (e.g. Recharts). Filters: client, job, date range.
4. Tests: unit tests for funnel and time-to-hire calculations with fixed fixtures.

Acceptance criteria:
- Dashboard shows funnel, time-to-hire, and conversion metrics from seeded data.
- Metrics respect role scoping and date-range filters.
- Calculation unit tests pass with known fixtures.

Do not commit.
```

---

## Phase 10 — Archiving & GDPR / Data Retention

```text
Read AGENTS.md (§6 archiving rules, §15 Security & Compliance). Implement archiving and GDPR.

Goal: compliant lifecycle end — archive, retention purge, and right-to-erasure.

Tasks:
1. Archiving: action to archive/restore an application (sets status=ARCHIVED/archivedAt). Archived
   records are read-only and excluded from active boards/reports (filterable in). Restore is
   Admin-only.
2. Retention: a scheduled job (cron/route handler) that finds records past a configurable
   retention window and anonymizes expired candidate PII; keep non-PII audit records.
3. GDPR right-to-erasure: Admin-only action to permanently delete/anonymize a candidate, cascade
   their attachments from storage, and write a PII-free erasure audit entry.
4. UI: archive controls on application/job; Settings → Data Retention (configure window, trigger
   manual purge); confirmation dialogs with explicit warnings.
5. Tests: erasure removes PII + attachments and leaves an audit record; archived items excluded
   from active queries.

Acceptance criteria:
- Archive/restore works with correct permissions; archived data hidden from active views.
- Erasure anonymizes/deletes PII and storage objects, leaving an audit trail.
- Retention job anonymizes expired records.

Do not commit.
```

---

## Phase 11 — Testing Hardening

```text
Read AGENTS.md (§13 Testing). Raise test coverage to the required bar.

Goal: confidence in core flows and the RBAC/lifecycle invariants.

Tasks:
1. Ensure Vitest is configured with a disposable/seeded test database for integration tests.
2. Unit tests: RBAC matrix (all roles), stage transition rules, funnel & time-to-hire, dedupe,
   Zod schemas.
3. Integration tests: moveStage transaction (StageHistory + SYSTEM note atomicity), application
   uniqueness, scorecard authorization.
4. Playwright e2e for the golden path: login → create client → create job → add candidate →
   create application → move through pipeline → schedule interview → submit scorecard → hire →
   archive. Add a negative test (hiring manager blocked from recruiter-only actions).
5. Wire `pnpm test` + `pnpm test:e2e`; ensure deterministic seeds.

Acceptance criteria:
- `pnpm test` and `pnpm test:e2e` pass locally and are deterministic.
- All invariants from AGENTS.md §6/§7/§13 are covered.

Do not commit.
```

---

## Phase 12 — Deployment

```text
Read AGENTS.md (§14 env, §16 workflow, §9 migrations). Prepare production deployment.

Goal: deploy to Vercel with managed PostgreSQL.

Tasks:
1. Provision managed Postgres (Neon/Supabase). Set DATABASE_URL + DIRECT_URL for pooled migrations.
2. Configure Vercel project + all env vars from AGENTS.md §14 (production values).
3. Set build to run `prisma generate` and a deploy step to run `prisma migrate deploy`
   (never `migrate dev`/`reset` in prod).
4. Configure S3-compatible storage bucket + CORS for presigned uploads; configure Resend domain.
5. Add a GitHub Actions CI: install, typecheck, lint, test, build on PRs.
6. Add a production seed/bootstrap path to create the first ADMIN user safely (no default creds).
7. Document the deploy + rollback steps in README.

Acceptance criteria:
- App builds and deploys; migrations apply via `migrate deploy`.
- First admin can log in; uploads and email work in production.
- CI runs green on PRs.

Do not commit unless I explicitly ask.
```

---

## Meta-Prompts (reusable, any phase)

### Bug fix (systematic)
```text
Read AGENTS.md. A bug: <describe symptom + repro steps + expected vs actual>.
Do NOT patch blindly. First: form 2-3 hypotheses, add a failing test that reproduces the bug,
identify the root cause, then fix it minimally. Confirm the test passes and no other tests break.
Explain the root cause and why the fix is correct. Keep changes scoped; follow the Definition of Done.
```

### Code review
```text
Read AGENTS.md. Review the changes in <files/branch> against it. Check: RBAC enforced server-side,
Zod validation at boundaries, business logic in services (thin actions/procedures), Prisma
conventions (§9), no PII in logs, error handling, tests, and accessibility. List issues by
severity (blocker/major/minor) with file:line references and concrete fixes. Do not edit code yet.
```

### Refactor
```text
Read AGENTS.md. Refactor <area> to <goal> with NO behavior change. Keep all tests green
throughout; if coverage is missing, add characterization tests first. Make incremental commits-worth
of changes, explain each step, and confirm typecheck/lint/test pass at the end.
```

### Add tests to existing code
```text
Read AGENTS.md §13. Add tests for <module/flow>. Cover happy path, edge cases, and the relevant
RBAC/lifecycle invariants. Use the seeded test DB for integration tests. Do not change production
behavior; if a test reveals a bug, stop and report it before fixing.
```

### New feature (generic)
```text
Read AGENTS.md. Implement <feature>. Before coding, restate the requirement, list affected
entities/services/UI, and note any schema/migration impact and RBAC rules. Then implement:
Zod schema → service (business logic + tests) → tRPC/Server Action (validate + authorize) → UI
(loading/empty/error/success). Finish against the Definition of Done. Ask before adding new deps.
```

### Schema change / migration
```text
Read AGENTS.md §9. Make this schema change: <describe>. Update schema.prisma following all
conventions, create a new migration (never edit applied ones), update the seed if needed, and
update affected services/validations/types. Confirm `prisma validate` + `pnpm typecheck` pass.
Explain data-migration/backfill needs for existing rows.
```

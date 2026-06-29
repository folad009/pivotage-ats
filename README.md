# Privotage Consulting ATS

Internal applicant tracking system for Privotage Consulting. See `AGENTS.md` for architecture, conventions, and the Definition of Done.

## Local development

```bash
pnpm install
cp .env.example .env   # fill in DATABASE_URL, AUTH_SECRET, etc.
pnpm prisma migrate dev
pnpm db:seed           # demo users + sample data (development only)
pnpm dev
```

Demo credentials (after seed): `recruiter@privotage.test` / `Password123!` (also admin and hiring manager variants).

### Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build (local; no migrations) |
| `pnpm vercel-build` | Generate client, run `migrate deploy`, build (used on Vercel) |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm test` | Vitest (unit + integration) |
| `pnpm test:e2e` | Playwright golden path + RBAC tests |
| `pnpm db:seed` | Reset + seed dev database |
| `pnpm db:bootstrap-admin` | Create first production admin (see below) |

## Production deployment (Vercel + PostgreSQL)

Detailed provisioning steps: **[docs/deployment.md](./docs/deployment.md)**.

Summary:

1. **Postgres** — Neon or Supabase; set pooled `DATABASE_URL` + direct `DIRECT_URL`.
2. **Vercel** — import repo, set all env vars from `AGENTS.md` §14, deploy.
3. **Build** — Vercel runs `vercel-build` → `prisma migrate deploy` then `next build` (never `migrate dev` / `reset` in prod).
4. **Storage** — R2/S3 bucket + CORS for presigned uploads ([CORS example](./docs/infrastructure/s3-cors.example.json)).
5. **Email** — Resend domain verified; set `RESEND_API_KEY` + `EMAIL_FROM`.
6. **Bootstrap** — run `pnpm db:bootstrap-admin` once with `BOOTSTRAP_ADMIN_*` env vars (no default passwords).

### Deploy

```bash
# Typical flow: push to main → Vercel auto-deploys
git push origin main
```

Verify after deploy:

- `/login` loads; bootstrap admin can sign in.
- Upload a resume on an application (S3 presigned PUT).
- Schedule an interview (email sent via Resend).

### Rollback

**Application code**

1. Vercel dashboard → **Deployments** → select last known-good deployment → **Promote to Production**.
2. Or redeploy a previous Git commit from the Vercel UI / CLI.

**Database schema**

- Prisma has **no automatic down migrations**. Rolling back schema changes requires a forward-fix migration or restoring a database snapshot from your provider.
- **Neon / Supabase**: use point-in-time recovery or a manual backup taken before the migration.
- Do **not** run `prisma migrate reset` against production.

**If a bad migration shipped**

1. Roll back the Vercel deployment (above).
2. Restore Postgres from backup if the migration modified data destructively.
3. Ship a corrective migration on a hotfix branch and redeploy.

## CI

GitHub Actions (`.github/workflows/ci.yml`) on pull requests and `main` pushes:

`pnpm install` → `typecheck` → `lint` → `test` → `build`

Uses a PostgreSQL service container for integration tests.

## Environment variables

Copy `.env.example` to `.env` locally. Production values are documented in `AGENTS.md` §14 and [docs/deployment.md](./docs/deployment.md).

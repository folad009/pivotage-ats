# Production environment checklist

Use this when provisioning **Neon**, **Supabase**, or another managed PostgreSQL provider and deploying to **Vercel**.

## 1. Managed PostgreSQL

### Neon (recommended)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy two connection strings from the dashboard:
   - **Pooled** → `DATABASE_URL` (host contains `-pooler`)
   - **Direct** → `DIRECT_URL` (non-pooled host)
3. Append `?sslmode=require` if not already present.

Example:

```bash
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

### Supabase

1. Project → **Settings → Database**.
2. Use **Transaction pooler** (port 6543) for `DATABASE_URL`.
3. Use **Direct connection** (port 5432) for `DIRECT_URL`.

> Prisma migrations must use `DIRECT_URL`. The app runtime uses the pooled `DATABASE_URL`.

## 2. Vercel project

1. Import the Git repository in [Vercel](https://vercel.com).
2. Framework preset: **Next.js**; install command: `pnpm install`.
3. Build uses the `vercel-build` script: `prisma generate && prisma migrate deploy && next build`.
4. Set **Production** environment variables (see table below).
5. Enable **Cron Jobs** (Pro plan) — `vercel.json` schedules daily retention purge at 04:00 UTC.

### Required production env vars

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL URL (runtime) |
| `DIRECT_URL` | Direct PostgreSQL URL (migrations only) |
| `AUTH_SECRET` | Session/JWT secret (`openssl rand -base64 32`) |
| `AUTH_URL` | Production URL, e.g. `https://ats.privotage.com` |
| `NEXTAUTH_URL` | Same as `AUTH_URL` |
| `APP_ENV` | `production` |
| `S3_ENDPOINT` | R2/S3 API endpoint |
| `S3_REGION` | `auto` for R2, or AWS region |
| `S3_BUCKET` | Bucket name |
| `S3_ACCESS_KEY_ID` | Storage access key |
| `S3_SECRET_ACCESS_KEY` | Storage secret |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Verified sender, e.g. `no-reply@yourdomain.com` |
| `CRON_SECRET` | Bearer token for `/api/cron/retention` |

Optional: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` for Google OAuth.

## 3. S3-compatible storage (Cloudflare R2 / AWS S3)

1. Create a private bucket (e.g. `privotage-ats-prod`).
2. Create API credentials with read/write on that bucket.
3. Apply CORS so the browser can `PUT` to presigned upload URLs:

   - Template: [`s3-cors.example.json`](./s3-cors.example.json)
   - R2: bucket → **Settings → CORS policy**
   - AWS S3: bucket → **Permissions → CORS**

4. Set `AllowedOrigins` to your production app URL(s) only.

## 4. Resend email

1. Add and verify your sending domain in [Resend](https://resend.com/domains).
2. Add DNS records (SPF, DKIM) as shown in the dashboard.
3. Set `EMAIL_FROM` to an address on the verified domain.
4. Set `RESEND_API_KEY` in Vercel.

Interview invites and notifications use Resend when both `RESEND_API_KEY` and `EMAIL_FROM` are set.

## 5. First admin user (production bootstrap)

**Do not** run `pnpm db:seed` in production — it wipes data and creates demo credentials.

After the first successful deploy and migration:

```bash
# Run locally against production DB, or use Vercel CLI / one-off job
DATABASE_URL="..." \
DIRECT_URL="..." \
BOOTSTRAP_ADMIN_EMAIL="admin@yourcompany.com" \
BOOTSTRAP_ADMIN_PASSWORD="your-strong-password-min-12-chars" \
BOOTSTRAP_ADMIN_NAME="Ada Admin" \
pnpm db:bootstrap-admin
```

The script is **idempotent**: it skips if an active `ADMIN` already exists.

## 6. Cron / retention purge

`vercel.json` registers a daily cron hitting `GET /api/cron/retention`.

- Set `CRON_SECRET` in Vercel (long random string).
- Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when configured under **Project → Cron Jobs**.
- Requires at least one active admin user (for audit attribution).

Manual test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.vercel.app/api/cron/retention
```

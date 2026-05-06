# Architecture — Wallick Work Tracker

## 1. System Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (employee/founder)           │
│  Next.js client components · React 19 · shadcn/ui · Recharts │
└───────────────┬────────────────────────────┬─────────────────┘
                │ HTTPS                      │ HTTPS
                ▼                            ▼
   ┌────────────────────────┐   ┌──────────────────────────┐
   │  Next.js Server (Vercel)│   │   Supabase Auth (JWT)    │
   │  · Server Components    │◀──│   email + password       │
   │  · Server Actions       │   └──────────────────────────┘
   │  · Route Handlers       │
   │  · Middleware (auth)    │
   └────────────┬────────────┘
                │ Prisma over pgbouncer
                ▼
   ┌─────────────────────────────────────┐
   │     PostgreSQL 16 (Supabase)        │
   │  users · tasks · work_logs ·        │
   │  time_entries · task_requests ·     │
   │  audit_log                          │
   │  + Row Level Security policies      │
   └─────────────────────────────────────┘
```

## 2. Data Flow

### Auth
1. User submits email+password to `/login`.
2. Server Action calls `supabase.auth.signInWithPassword`.
3. Supabase sets an HTTP-only session cookie.
4. `middleware.ts` reads the cookie, refreshes the session if needed, and attaches `userId` to the request.
5. Server Components/Actions call `requireUser()` which loads the `User` row and its role.

### Mutation (e.g., create work log)
1. Client form (RHF + Zod) submits to a Server Action `createWorkLog(input)`.
2. Server Action: `requireUser()` → Zod parse → Prisma write inside a transaction → `revalidatePath('/dashboard')` and `revalidatePath('/log')`.
3. Server returns `{ ok: true, data }` or a typed error; UI re-renders.

### Read (founder dashboard)
1. Founder navigates to `/admin/overview?from=…&to=…`.
2. Server Component calls `getTeamOverview(range)` from `src/server/queries/`.
3. Query runs aggregations in Postgres in a single round-trip (`groupBy` + a join).
4. Returns a typed view model; component renders charts/tables.

## 3. Tech Stack — Rationale

| Choice | Why this, not the trendier option |
|---|---|
| Next.js 15 App Router | One framework for SSR + API + routing. Server Actions remove most REST boilerplate. Vercel zero-config. |
| TypeScript strict | The system has roles, statuses, money-of-time. Type errors > runtime errors. |
| Supabase (Auth + Postgres) | Auth, Postgres, and RLS in one tier ($25/mo Pro, generous free tier). Avoids a second auth vendor. We can swap Supabase Auth for NextAuth later if we outgrow it; the DB stays. |
| Prisma | Best-in-class TypeScript ORM. Migration story works. Drizzle is leaner but Prisma's ecosystem (Studio, seed) saves time on internal tools. |
| Tailwind 4 + shadcn/ui | shadcn copies primitives into the repo — no version-pinning gymnastics, no upstream breakage. Tailwind 4 is the current stable. |
| Zod | Validation at every boundary. Same schema for client and server. |
| React Hook Form | Less re-render thrash than Formik. Zod resolver. |
| TanStack Query | Only used where Server Components don't fit (timer widget polling). Not a global data layer. |
| Recharts | Boring, declarative, enough for bar/line charts. |
| Vitest + Playwright | Vitest for queries/validation; Playwright for the 3–4 critical e2e flows. |
| pnpm | Disk-efficient, fast, monorepo-friendly if we ever split. |
| Vercel | Free for this scale. Native Next.js. Preview deployments per PR. |

## 4. Key Design Decisions & Trade-offs

- **Server Actions over REST API for internal flows.** [Decision] Fewer moving parts, type-safe end-to-end. The `/api/*` route handlers exist only for things that need fetch (CSV download, healthcheck, future webhooks).
- **Single org / no tenancy.** [Decision] Wallick is the only customer. Adding `orgId` to every table is premature complexity. If we go multi-tenant later, we add it then.
- **Soft delete on Task/WorkLog.** [Decision] Work-tracking data is audit-relevant; founders may want to "undo delete." Hard delete reserved for founders behind a confirmation.
- **Role on `User` row, not Supabase metadata.** [Decision] Easier to query, join, and audit. Supabase user is the auth principal; our `User` table is the domain principal.
- **Time stored as integer minutes.** [Decision] Avoids float drift. Hours are derived (`minutes / 60`).
- **Timezone per user, default `Asia/Kolkata`.** [Assumption] Team is India-based given student consulting context. Override on user record if not.
- **No real-time / websockets.** [Decision] Page reload + Server Actions are enough at this scale. Adding Supabase Realtime is a v2 decision driven by user complaints, not anticipation.
- **CSV export as the only export format in v1.** [Decision] Covers the founder's "share with stakeholders" need. PDF/XLSX is v2.
- **Timer is a single-active model.** [Decision] Only one running timer per user. Avoids reconciliation logic. If two devices try to start, the second wins and the first stops with a warning surfaced on next page load.
- **No background jobs in v1.** [Decision] "No log today by 7pm" is computed at read time. When we add notifications, we add a Vercel Cron Job, not a separate worker.

## 5. Third-Party Services / APIs / SDKs

| Service | Purpose | Plan needed |
|---|---|---|
| Supabase | Postgres + Auth | Free tier covers ≤50 users; upgrade to Pro ($25/mo) when DB > 500MB or for daily backups. |
| Vercel | Hosting | Hobby tier for staging; Pro ($20/mo/seat) when going to production with custom domain + analytics. |
| Resend | Transactional email (invite emails) — Phase 8 | Free tier (3k emails/mo) is plenty. |
| Sentry | Error tracking | Free tier (5k errors/mo) is plenty. |

No other external SDKs in v1.

## 6. Environments
- **Local** — Postgres via Supabase local stack OR a remote dev project; `.env.local` with `NEXT_PUBLIC_SUPABASE_*` and `DATABASE_URL`.
- **Preview** — Vercel preview per PR; uses a dedicated Supabase preview project.
- **Production** — Vercel production; Supabase production project; Sentry prod DSN; Resend prod key.

## 7. Security Posture
- All Server Actions/routes call `requireUser()` (or `requireFounder()`) first. Centralized in `src/lib/auth.ts`.
- Supabase RLS enabled on every table as defense-in-depth: employees can only read rows where `user_id = auth_user_id()`; founders bypass via a SECURITY DEFINER policy keyed off the role claim.
- HTTPS enforced via Vercel.
- Secrets only in environment variables. `.env.example` is the contract; no secrets in code or in `next.config.ts`.
- CSP headers set in `next.config.ts`: `default-src 'self'`, allow Supabase and Vercel domains explicitly.
- Rate limit on `/login` (5 attempts/min/IP) via a small in-memory limiter; revisit if abused.

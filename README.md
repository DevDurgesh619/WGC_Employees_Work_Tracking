# Wallick Work Tracker

Internal employee work-tracking & task-management system for Wallick Global Consulting. Founders assign tasks; employees log daily work; everyone sees what's happening.

## Stack
Next.js 15 · React 19 · TypeScript 5.9 · Tailwind 4 · shadcn/ui · Prisma 6 · Postgres (Supabase) · TanStack Query 5 · Recharts 2 · Vitest 2 + Playwright 1.48 · Sentry · Vercel

## Quickstart

Prerequisites: Node 20, pnpm 9, a Supabase project.

```bash
git clone <repo>
cd Work_Tracking
pnpm install
cp .env.example .env.local   # fill in Supabase + DB URLs
pnpm db:migrate              # applies prisma/migrations
pnpm db:seed                 # creates founders + sample employees
pnpm dev                     # → http://localhost:3100
```

The dev server runs on port **3100** (not 3000 — see `package.json`). Sign in with `founder.one@example.test` or `employee.alice@example.test` — password `DevPassword123!` (printed by `pnpm db:seed`).

## Scripts
| Command | Purpose |
|---|---|
| `pnpm dev` | dev server (port 3100) |
| `pnpm build` / `pnpm start` | production build / serve |
| `pnpm lint` / `pnpm typecheck` | static checks |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright (needs `pnpm dev` running) |
| `pnpm db:migrate` | apply migrations |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | seed founders + employees + tasks |

## Roles

- **Founder** — sees `/admin/overview`, `/admin/employees`, `/admin/assign`, `/admin/requests`, `/admin/reports`. Cannot run timers or log own work; supervisory role only.
- **Employee** — sees `/dashboard`, `/tasks`, `/log`. Logs work, runs the topbar timer, requests tasks when idle.

Role separation is enforced server-side via `requireFounder()` / `requireEmployee()` in [src/lib/auth.ts](src/lib/auth.ts). Supabase RLS provides defense-in-depth — see [prisma/migrations/20260506000000_enable_rls](prisma/migrations/20260506000000_enable_rls/migration.sql).

## Where to look
- [CLAUDE.md](CLAUDE.md) — context for AI tooling and conventions
- [PRD.md](PRD.md) — what we're building
- [ARCHITECTURE.md](ARCHITECTURE.md) — how it fits together
- [DATA_MODEL.md](DATA_MODEL.md) — DB schema
- [API_SPEC.md](API_SPEC.md) — Server Actions and routes
- [ROADMAP.md](ROADMAP.md) — phased build plan

## Production deploy checklist

Run before promoting `main` to a production Vercel deploy.

### Environment
- [ ] Set in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SENTRY_DSN` (optional), `SENTRY_AUTH_TOKEN` (only if uploading source maps).
- [ ] `DATABASE_URL` points to the Supabase **pooler** (`*.pooler.supabase.com`); `DIRECT_URL` points to the direct connection.
- [ ] Confirm Supabase project region matches what `DATABASE_URL` advertises.

### Database
- [ ] `pnpm exec prisma migrate deploy` runs cleanly against prod.
- [ ] RLS migration `20260506000000_enable_rls` is applied — verify with `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace;`.
- [ ] Seed founders **only**: `pnpm db:seed` is idempotent but rewrites passwords; run it once for prod and rotate credentials afterwards.

### Build / smoke
- [ ] `pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green locally.
- [ ] Visit `/api/health` on the deployed URL — returns `{ ok: true, ts }`.
- [ ] Visit `/login` — sign in as a founder, then as an employee.
- [ ] Founder sees admin nav only; employee sees dashboard / tasks / log.

### Security
- [ ] Browser devtools shows the configured CSP, HSTS, and `X-Frame-Options: DENY` headers on `/dashboard`.
- [ ] Direct visit to `/admin/overview` as an employee → redirects to `/403`.
- [ ] Direct visit to `/dashboard` as a founder → redirects to `/admin/overview`.

### Observability
- [ ] If Sentry is configured, trigger a test error (any 500 path) and confirm capture in the Sentry project.
- [ ] Confirm `audit_logs` rows appear after a task create / status change / log create (`select * from audit_logs order by created_at desc limit 10;`).

### Rollback
- A failed deploy can be rolled back via Vercel UI without DB changes. RLS migration is forward-only — do not roll back schema once production has writes.

## License
Proprietary — internal use only.

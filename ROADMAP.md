# Roadmap — Wallick Work Tracker

Each task should fit a single Claude Code session. Work top-to-bottom. Tick a box only after `pnpm typecheck && pnpm lint && pnpm test` pass and the change is committed.

---

## Phase 0 — Project Setup & Scaffolding

- [x] T0.1 Initialize Next.js 15 app with TypeScript, App Router, Tailwind 4 (`pnpm create next-app`). Pin Node 20 in `.nvmrc`. Commit baseline.
- [x] T0.2 Set `packageManager: pnpm@9` and `engines.node = ">=20"` in `package.json`.
- [x] T0.3 Configure ESLint (Next + Prettier + Tailwind plugin) and Prettier. Add `pnpm lint` script.
- [x] T0.4 Configure `tsconfig.json` strict; absolute imports `@/*`.
- [x] T0.5 Install shadcn/ui CLI and initialize (`components.json`). Add primitives: `button`, `input`, `label`, `card`, `dialog`, `dropdown-menu`, `select`, `textarea`, `tabs`, `table`, `toast`, `badge`, `skeleton`, `separator`, `avatar`.
- [x] T0.6 Install: Prisma 6, Zod 3, RHF 7, `@hookform/resolvers`, date-fns 4, Recharts 2, Vitest 2, Playwright 1.48, `@supabase/ssr`, `@supabase/supabase-js`. Lock versions.
- [x] T0.7 Create `prisma/schema.prisma` from `DATA_MODEL.md` (no migrations yet — review only).
- [x] T0.8 Set up Supabase project (manual user step). Save connection strings to `.env.local`.
- [x] T0.9 Run `pnpm prisma migrate dev --name init` to create initial migration.
- [x] T0.10 Add `src/lib/db.ts` (Prisma singleton) and `src/lib/supabase/{client,server,middleware}.ts`.
- [x] T0.11 Add `src/middleware.ts` to refresh Supabase session and redirect unauthenticated users to `/login` (except `/login`, `/api/health`).
- [x] T0.12 Add `src/lib/auth.ts` with `getSession()`, `requireUser()`, `requireFounder()`. Add `src/lib/rbac.ts`.
- [x] T0.13 Add base layout in `src/app/layout.tsx` and `globals.css` (shadcn theme tokens).
- [x] T0.14 Add `prisma/seed.ts` — creates 2 founders + 3 employees with known passwords; sample tasks. Wire `pnpm db:seed`.
- [x] T0.15 Configure Vitest (`vitest.config.ts`) + Playwright (`playwright.config.ts`). One smoke test each.
- [ ] T0.16 Configure Vercel project (manual user step) and push first deploy. Verify `/api/health` returns 200.
- [x] T0.17 Add Sentry (browser + server) with env-gated DSN.

## Phase 1 — Auth & Skeleton

- [x] T1.1 Build `/login` page with email+password form (RHF + Zod). Server Action calls `signInWithPassword`. Redirect to `/dashboard` on success.
- [x] T1.2 Build app shell `(app)/layout.tsx`: sidebar (Dashboard, My Tasks, Log Work, Reports), top bar (avatar + sign out), founder nav extension.
- [x] T1.3 Sign-out Server Action + UI button.
- [x] T1.4 `/dashboard` route — empty placeholder shows "Hello, {name}".
- [x] T1.5 Founder-only guard wrapper around `/admin/*`. Test by visiting as employee → 403 page.
- [x] T1.6 Add `requireUser`/`requireFounder` unit tests.
- [x] T1.7 e2e: login flow happy path.

## Phase 2 — Tasks (Founder + Employee)

- [x] T2.1 Zod schemas for Task in `src/lib/validations/task.ts`.
- [x] T2.2 `src/server/queries/tasks.ts`: `listTasksForUser`, `getTaskById`, `getTeamTasks`.
- [x] T2.3 `src/server/actions/tasks.ts`: `createTask`, `bulkCreateTasks`, `updateTask`, `setTaskStatus`, `deleteTask`.
- [x] T2.4 Admin `/admin/assign` page: table of employees + "New task" dialog (multi-select assignees).
- [x] T2.5 Employee `/tasks` page: list of my tasks, filterable by status, sortable by priority/due date.
- [x] T2.6 `/tasks/[id]` page: details + status changer for assignee.
- [x] T2.7 Toast feedback on all mutations.
- [x] T2.8 Vitest: status transition rules; permission rules.
- [x] T2.9 e2e: founder creates task → employee sees it → employee marks DONE → founder sees DONE.

## Phase 3 — Work Logging

- [x] T3.1 Zod schemas for WorkLog.
- [x] T3.2 Queries: `listMyLogs(date)`, `getMyDay(date)`.
- [x] T3.3 Actions: `createWorkLog`, `updateWorkLog` (24h window), founder `deleteWorkLog`.
- [x] T3.4 `/log` page: date picker + list of today's logs + "Add log" dialog with task select OR free-text.
- [x] T3.5 `/dashboard` shows today's total minutes and open tasks. "Request task" button when zero open.
- [x] T3.6 Vitest: 24h edit window, free-text vs task FK invariants.
- [x] T3.7 e2e: log work for an assigned task → see total update.

## Phase 4 — Timer

- [x] T4.1 Schema + actions: `startTimer`, `stopTimer`, `getActiveTimer`.
- [x] T4.2 Timer widget in top bar — sticky, polls every 30s via TanStack Query.
- [x] T4.3 Stop flow offers "create draft work log" pre-filled.
- [x] T4.4 Conflict UI when a second device tries to start a timer.
- [x] T4.5 Vitest: single-active invariant; minutes computation rounding (round to nearest minute, min 1).

## Phase 5 — Founder Dashboard & Reports

- [x] T5.1 `getTeamOverview` query (one round-trip; group by user, date).
- [x] T5.2 `/admin/overview` page: per-employee table with hours, completed, in-progress, "no log today" badge, 7-day sparkline.
- [x] T5.3 `/admin/employees/[id]` drill-down: date range picker, daily logs, tasks, time entries.
- [x] T5.4 Recharts: weekly stacked bar by employee.
- [x] T5.5 CSV export route `/api/export/work-logs.csv`. Streams.
- [x] T5.6 Vitest: CSV escaping, range filter.
- [x] T5.7 e2e: founder views overview after employee logs work.

## Phase 6 — Idle Time & Task Requests

- [x] T6.1 Schema + actions for TaskRequest.
- [x] T6.2 Employee dashboard "Request task" button; shows pending requests.
- [x] T6.3 Founder `/admin/requests` queue with one-click "create task in response" dialog.
- [x] T6.4 Decline with note flow.
- [x] T6.5 e2e: idle employee requests → founder fulfills → employee sees new task.

## Phase 7 — Polish & Hardening

- [x] T7.1 Supabase RLS policies applied (sql migration). Verify with role-switched queries.
- [x] T7.2 Audit log: write entries on task and work-log mutations (centralized helper).
- [x] T7.3 Empty states + skeleton loaders on every list/dashboard.
- [x] T7.4 Mobile responsive pass on all pages.
- [x] T7.5 Accessibility pass: tab order, aria-labels, contrast.
- [x] T7.6 Error boundary + 404/403 pages.
- [x] T7.7 Add CSP headers in `next.config.ts`.
- [x] T7.8 README finalize. Production deploy checklist run.

## Phase 8 — Post-MVP Backlog (not scheduled)
- Email notifications via Resend (invites, task-request fulfilled, no-log nudge).
- Vercel Cron job for nightly "no-log" digest to founders.
- Slack integration.
- AI-suggested task assignment.
- PDF/XLSX exports.
- Goals / OKRs.
- Mobile app (React Native).

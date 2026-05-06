# CLAUDE.md — Wallick Work Tracker

## Project Overview
Wallick Work Tracker is an internal web app for Wallick Global Consulting. It lets the two founders assign daily tasks to employees, lets employees log their work (task, description, time spent, output, status), and gives founders a dashboard with per-employee productivity, time spent, and completion stats. The goal is to make work visible, eliminate idle time caused by unassigned work, and produce daily/weekly reports for accountability.

## Tech Stack (exact versions)
- Node.js 20 LTS
- pnpm 9
- Next.js 15.x (App Router, Server Actions, Server Components)
- React 19
- TypeScript 5.6
- Tailwind CSS 4
- shadcn/ui (Radix primitives + class-variance-authority)
- Prisma 6 (ORM)
- PostgreSQL 16 (via Supabase)
- Supabase Auth (email + password; magic link optional later)
- Zod 3 (validation everywhere data crosses a boundary)
- React Hook Form 7
- TanStack Query 5 (only on pages with optimistic updates / polling — e.g. timer widget)
- Recharts 2 (charts)
- date-fns 4 (no moment, no Day.js)
- Vitest 2 (unit) + Playwright 1.48 (e2e — only critical flows)
- ESLint + Prettier (Tailwind plugin sorted)
- Vercel (deployment)
- Sentry (error tracking)

## Folder Map
- `prisma/` — Prisma schema, migrations, seed script.
- `src/app/(auth)/` — Login, password reset.
- `src/app/(app)/` — Authenticated app shell. Employee surfaces.
- `src/app/(app)/admin/` — Founder-only routes (RBAC enforced server-side).
- `src/app/api/` — Route handlers for HTTP-required cases (CSV download, health). Most data flows go through Server Actions.
- `src/components/ui/` — shadcn primitives. Don't edit by hand; regenerate via the CLI.
- `src/components/{tasks,work-logs,dashboards,charts,layout}/` — feature components.
- `src/server/actions/` — Server Actions (mutations).
- `src/server/queries/` — Query functions (typed Prisma reads).
- `src/lib/supabase/` — Supabase client/server/middleware helpers.
- `src/lib/auth.ts` — `getSession()`, `requireUser()`, `requireFounder()`.
- `src/lib/rbac.ts` — Role checks.
- `src/lib/validations/` — Zod schemas (one file per entity).
- `src/lib/reports.ts` — Aggregations for dashboards.
- `src/types/` — Shared TS types.
- `tests/unit/` — Vitest. `tests/e2e/` — Playwright.
- `scripts/` — One-off ops scripts (e.g., promote user to founder).

## Conventions
- **TypeScript strict.** No `any`. If you reach for `any`, narrow with `unknown` and a Zod parse instead.
- **Server-first.** Default to Server Components and Server Actions. Add `"use client"` only when you need state, refs, or browser APIs.
- **Validate at every boundary** with Zod. Never trust input from forms, params, or external APIs.
- **RBAC server-side.** Every Server Action and route handler must call `requireUser()` or `requireFounder()` before doing work. Never trust a role flag in client state.
- **Naming:** kebab-case files, PascalCase components, camelCase variables. Booleans prefixed `is/has/should/can`.
- **Imports:** absolute via `@/*`. No relative `../../`.
- **Errors:** server actions return `{ ok: true, data }` or `{ ok: false, error: <code>, message? }`. Never swallow.
- **Dates:** store UTC in DB; render in user's timezone via date-fns and the user's `timezone` field.
- **Time durations:** stored as integer minutes (not floats, not strings).
- **DB access:** only through `src/server/queries/` and `src/server/actions/`. Components never import Prisma directly.
- **Tailwind:** use shadcn theme tokens (`bg-background`, `text-foreground`). No raw hex colors in components.
- **Forms:** React Hook Form + Zod resolver. No uncontrolled HTML forms with manual `FormData` parsing in components.

## Anti-patterns — DO NOT
- Don't add a new dependency without asking. The stack above is the stack.
- Don't put business logic in Client Components.
- Don't use `useEffect` for data fetching when a Server Component or Server Action will do.
- Don't write raw SQL when Prisma will do; if Prisma genuinely can't, ask before adding `$queryRaw`.
- Don't bypass RBAC with "TODO: add auth check later."
- Don't log PII (emails, names) to stdout.
- Don't introduce state managers (Redux, Zustand, Jotai). React state + Server Actions are enough at this scale.
- Don't write barrel `index.ts` files. Import from the actual file.
- Don't add comments explaining what code does. Only why, when non-obvious.
- Don't generate seed data with real names/emails. Use `Founder One`, `Employee Alice`, etc.

## Commands
- `pnpm install` — install
- `pnpm dev` — Next dev server (port 3000)
- `pnpm build` — production build
- `pnpm start` — run built app
- `pnpm lint` — ESLint
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm test` — Vitest unit
- `pnpm test:e2e` — Playwright (requires `pnpm dev` running or `pnpm build && pnpm start`)
- `pnpm db:push` — sync Prisma schema to DB (dev only; no migration file)
- `pnpm db:migrate` — create + apply a migration (use this for any schema change after Phase 0)
- `pnpm db:studio` — Prisma Studio
- `pnpm db:seed` — seed script (founders + a few employees + sample tasks)

## Rules of Engagement (for Claude Code)
1. **Small commits.** One logical change per commit. Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`).
2. **Confirm before:** adding a dependency, changing the Prisma schema, touching auth/RBAC, modifying `.env.example`, deleting any file, or doing anything destructive in the DB.
3. **After every change** that touches code: run `pnpm typecheck` and `pnpm lint`. Fix everything before reporting done.
4. **After server-side changes:** run `pnpm test`. Add a test if you added a query/action with non-trivial logic.
5. **One Roadmap task at a time.** Read `ROADMAP.md`, pick the next unfinished task, do it, tick the checkbox in the file, commit.
6. **Don't refactor outside the task.** If you see something off, note it and move on.
7. **Never push to a remote `main` without explicit user confirmation.** Local commits and feature branches are fine.
8. **If a task is ambiguous,** prefer the simpler interpretation and tag the assumption in your commit message: `[assumed: ...]`.
9. **Don't modify these docs** (`CLAUDE.md`, `PRD.md`, `ARCHITECTURE.md`, `DATA_MODEL.md`, `API_SPEC.md`) without explicit instruction. `ROADMAP.md` is updated as tasks complete (check off boxes only).
10. **Whenever a Phase completes,** stop and ask the user to verify before starting the next.

## Where to Find Each Doc
- `PRD.md` — what we're building and why, user stories, success metrics.
- `ARCHITECTURE.md` — system design, data flow, decisions and trade-offs.
- `DATA_MODEL.md` — entities, fields, relationships, enums.
- `API_SPEC.md` — Server Actions and route handlers (request/response shapes, auth rules).
- `ROADMAP.md` — phased build plan with atomic tasks. **Always start here.**
- `.env.example` — required environment variables with comments.
- `README.md` — humans-only quickstart.

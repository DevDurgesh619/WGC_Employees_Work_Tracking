# Folder Structure — Wallick Work Tracker

Generated up-front so Claude Code has the target shape before scaffolding. Phase 0 of `ROADMAP.md` produces this tree.

```
Work_Tracking/
├── CLAUDE.md                              # AI-tooling context, conventions, commands
├── PRD.md                                 # Product requirements
├── ARCHITECTURE.md                        # System design
├── DATA_MODEL.md                          # DB schema
├── API_SPEC.md                            # Server Actions + HTTP routes
├── ROADMAP.md                             # Phased build plan (always start here)
├── FOLDER_STRUCTURE.md                    # This file
├── README.md                              # Human quickstart
├── .env.example                           # Env var contract
├── .env.local                             # (gitignored) actual secrets
├── .gitignore
├── .nvmrc                                 # Node 20
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.ts                         # CSP headers, Sentry
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json                        # shadcn config
├── eslint.config.mjs
├── prettier.config.mjs
├── vitest.config.ts
├── playwright.config.ts
│
├── prisma/
│   ├── schema.prisma                      # Source of truth for DB
│   ├── migrations/                        # Generated migrations
│   └── seed.ts                            # Founders + employees + sample tasks
│
├── public/                                # Static assets (logo, favicon)
│
├── src/
│   ├── middleware.ts                      # Supabase session refresh + auth redirect
│   │
│   ├── app/
│   │   ├── layout.tsx                     # Root <html> shell
│   │   ├── globals.css                    # shadcn theme tokens, Tailwind base
│   │   ├── page.tsx                       # Landing → redirects to /dashboard or /login
│   │   ├── error.tsx                      # Global error boundary
│   │   ├── not-found.tsx                  # 404
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx                 # Centered card layout
│   │   │   └── login/page.tsx             # Email + password
│   │   │
│   │   ├── (app)/
│   │   │   ├── layout.tsx                 # Sidebar + topbar; requireUser()
│   │   │   ├── dashboard/page.tsx         # Employee home
│   │   │   ├── tasks/
│   │   │   │   ├── page.tsx               # My tasks list
│   │   │   │   └── [id]/page.tsx          # Task detail + status changer
│   │   │   ├── log/page.tsx               # Daily work entry
│   │   │   ├── reports/page.tsx           # Personal reports
│   │   │   │
│   │   │   └── admin/                     # Founder-only; requireFounder()
│   │   │       ├── layout.tsx
│   │   │       ├── overview/page.tsx      # Team dashboard
│   │   │       ├── employees/
│   │   │       │   ├── page.tsx           # List
│   │   │       │   └── [id]/page.tsx      # Drill-down
│   │   │       ├── assign/page.tsx        # Bulk task creation
│   │   │       ├── requests/page.tsx      # Task request queue
│   │   │       └── reports/page.tsx       # Team reports + CSV link
│   │   │
│   │   └── api/
│   │       ├── health/route.ts            # Public liveness
│   │       └── export/
│   │           ├── work-logs.csv/route.ts
│   │           └── tasks.csv/route.ts
│   │
│   ├── components/
│   │   ├── ui/                            # shadcn primitives (button, input, dialog…)
│   │   ├── layout/                        # Sidebar, Topbar, NavLink, UserMenu
│   │   ├── tasks/                         # TaskCard, TaskForm, StatusBadge, …
│   │   ├── work-logs/                     # LogForm, LogList, DayTotals
│   │   ├── timer/                         # TimerWidget, TimerStopDialog
│   │   ├── dashboards/                    # OverviewTable, NoLogBadge, EmployeeRow
│   │   └── charts/                        # WeeklyStackedBar, Sparkline
│   │
│   ├── server/
│   │   ├── actions/                       # Server Actions (mutations)
│   │   │   ├── auth.ts
│   │   │   ├── tasks.ts
│   │   │   ├── work-logs.ts
│   │   │   ├── time-entries.ts
│   │   │   ├── task-requests.ts
│   │   │   └── users.ts
│   │   └── queries/                       # Typed Prisma reads
│   │       ├── tasks.ts
│   │       ├── work-logs.ts
│   │       ├── time-entries.ts
│   │       ├── reports.ts
│   │       └── users.ts
│   │
│   ├── lib/
│   │   ├── db.ts                          # Prisma singleton
│   │   ├── supabase/
│   │   │   ├── client.ts                  # Browser client
│   │   │   ├── server.ts                  # Server client (cookies)
│   │   │   └── middleware.ts              # Session refresh helper
│   │   ├── auth.ts                        # getSession, requireUser, requireFounder
│   │   ├── rbac.ts                        # canEditTask, canDeleteWorkLog, …
│   │   ├── reports.ts                     # Aggregation helpers (pure functions)
│   │   ├── csv.ts                         # CSV streaming + escaping
│   │   ├── time.ts                        # Minutes ↔ hours, tz helpers
│   │   ├── audit.ts                       # writeAudit({...})
│   │   ├── utils.ts                       # cn(), small helpers
│   │   └── validations/
│   │       ├── task.ts
│   │       ├── work-log.ts
│   │       ├── time-entry.ts
│   │       ├── task-request.ts
│   │       └── user.ts
│   │
│   ├── hooks/
│   │   ├── use-active-timer.ts
│   │   └── use-toast.ts                   # shadcn-provided
│   │
│   └── types/
│       ├── api.ts                         # ActionResult<T>, ErrorCode
│       └── domain.ts                      # Re-exports of Prisma types
│
├── tests/
│   ├── unit/
│   │   ├── auth.test.ts
│   │   ├── tasks.test.ts
│   │   ├── work-logs.test.ts
│   │   ├── reports.test.ts
│   │   └── csv.test.ts
│   └── e2e/
│       ├── login.spec.ts
│       ├── task-flow.spec.ts
│       ├── log-flow.spec.ts
│       └── overview.spec.ts
│
└── scripts/
    ├── promote-to-founder.ts              # Manual role bump
    └── apply-rls.sql                      # RLS policies (Phase 7)
```

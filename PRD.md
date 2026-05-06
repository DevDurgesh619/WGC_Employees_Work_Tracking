# Product Requirements Document — Wallick Work Tracker

## 1. Problem Statement
Wallick Global Consulting is a student consulting company run by two founders. The company tracks student/client information well, but has no system to track its own employees' work. As a result, the founders cannot answer:
- What did each employee do today/this week?
- How much time did they spend on it?
- What was the output?
- Who is idle, and why?

A second-order problem is that employees are often idle because no one assigns them tasks. The system must both record work and drive work assignment.

## 2. Target Users / Personas

### Founder (admin) — 2 users
Wants visibility on every employee's daily output, time spent, completion rate. Needs to assign tasks. Reviews weekly reports. Time-poor; values dashboards over deep dives.

### Employee — ~5–20 users
Logs daily work, sees assigned tasks, marks them done. Mixed technical sophistication. Needs the logging flow to take <60 seconds per entry.

### Internal dev / power user (you)
Has founder role plus seed/admin scripts. Not a separate persona in the app — just a founder who also has shell access.

## 3. User Stories

### Authentication
- US-1. As any user, I want to log in with email + password so I can access my dashboard.
- US-2. As a founder, I want to invite a new employee by email so they can join the system.

### Tasks (assignment)
- US-3. As a founder, I want to create a task and assign it to an employee with a title, description, priority, due date, and estimated minutes, so the employee knows what to work on.
- US-4. As a founder, I want to bulk-assign a task to multiple employees so I don't repeat myself.
- US-5. As an employee, I want to see all tasks assigned to me, sorted by priority and due date, so I always have something to work on.
- US-6. As an employee, I want to update a task status (Not Started → In Progress → Done / Blocked) so my founder sees current state.
- US-7. As a founder, I want to see open tasks per employee so I can rebalance workload.

### Work Logging
- US-8. As an employee, I want to fill a daily work log entry with task name (or free-text if no task), description, time spent (minutes), output/result, and status, so my work is recorded.
- US-9. As an employee, I want to start/stop a timer on a task so I don't have to estimate time.
- US-10. As an employee, I want to edit my own log entry within 24 hours so I can fix mistakes.
- US-11. As a founder, I want to see a "no log today" flag on any employee who hasn't logged work by 7pm local time so I can follow up.

### Dashboards & Reports
- US-12. As a founder, I want a dashboard showing per-employee total hours, completed tasks, in-progress tasks, and a 7-day trend so I can spot patterns.
- US-13. As a founder, I want to drill into one employee and see their daily logs and tasks for any date range.
- US-14. As an employee, I want to see my own week-at-a-glance: tasks assigned, tasks completed, hours logged.
- US-15. As a founder, I want to export a weekly CSV of all logs so I can share with stakeholders.

### Idle Time
- US-16. As an employee, when I have zero unfinished tasks, I want the dashboard to show a clear "Request a task" action that pings the founders.
- US-17. As a founder, I want to see a queue of "task requests" from idle employees so I can quickly assign them work.

## 4. Functional Requirements
Each must be testable.

- FR-1. The system supports two roles: `FOUNDER` and `EMPLOYEE`. Role is stored on the user record and enforced server-side.
- FR-2. Only `FOUNDER` can create users, assign tasks, view other employees' data, and access `/admin/*` routes.
- FR-3. A task has: title (required, ≤120 chars), description (≤2000 chars), priority (LOW|MEDIUM|HIGH|URGENT), status (NOT_STARTED|IN_PROGRESS|DONE|BLOCKED|CANCELLED), assignee (required), creator (auto), due date (optional), estimated minutes (optional).
- FR-4. A work log entry has: date, task (optional FK), free-text task name (if no FK), description (required, ≤2000 chars), minutes spent (required, integer ≥1), output/result (≤2000 chars), status (IN_PROGRESS|DONE).
- FR-5. An employee can create unlimited work log entries per day. Total minutes per day is computed, not stored.
- FR-6. A timer can be started on a task. Only one active timer per user. Stopping it creates a `TimeEntry` row tied to the task and (optionally) auto-creates a draft work log.
- FR-7. Founder dashboard shows for any date range: per-employee total minutes, completed tasks count, in-progress tasks count, "no log today" flag.
- FR-8. Employee dashboard shows: today's assigned tasks, today's logged minutes, this-week summary, a "Request task" button when zero open tasks.
- FR-9. CSV export is available to founders for any date range, including all logs and tasks.
- FR-10. All times are stored in UTC. Display uses the user's `timezone` (default `Asia/Kolkata`).
- FR-11. Audit fields (`createdAt`, `updatedAt`, `createdById` where applicable) on every mutable entity.
- FR-12. Soft-delete (`deletedAt`) on `Task` and `WorkLog`. Hard-delete is admin-only.

## 5. Non-Functional Requirements
- **Performance.** P95 page load < 1.5s on a warm Vercel edge for ≤50 users. DB query budget per page < 200ms.
- **Security.** RBAC enforced on every Server Action and route handler. No client-trusted role checks. Supabase RLS as defense-in-depth on every table. HTTPS only.
- **Privacy.** Employees can only read their own logs and tasks; founders can read all. PII (email, name) never logged to stdout/Sentry.
- **Accessibility.** WCAG 2.1 AA. All interactive elements keyboard-navigable. shadcn/ui defaults are AA-compliant; preserve them.
- **Reliability.** No data loss on form submission errors — errors are surfaced inline; the form state is preserved.
- **Audit.** Every mutation writes `createdById`/`updatedById` (where applicable). No anonymous writes.
- **Browser support.** Last 2 versions of Chrome, Edge, Safari, Firefox. No IE.
- **Mobile.** Must be usable (responsive) on phones; not pixel-perfect.

## 6. Out of Scope (v1)
- Mobile native apps (responsive web only).
- Slack / email notifications (Phase 8 backlog; v1 is in-app only).
- Client/student data — already handled elsewhere; this app is internal-only.
- Payroll, billing, invoicing.
- OKRs / goal-setting.
- Public API.
- Multi-tenant / multi-org. This is a single-org internal tool.
- SSO / SAML.
- Localization. UI is English only.
- AI-driven task assignment. v1 has a manual queue with a "request task" button; auto-assignment is a v3 feature.

## 7. Success Metrics
- **Adoption:** ≥90% of employees log work on ≥4 of 5 working days within 30 days of launch.
- **Visibility:** founders open the admin dashboard at least 3 times per week in month 1.
- **Idle time:** "task requests" answered within 4 working hours (median).
- **Data quality:** ≤5% of work logs missing minutes or output fields.
- **Reliability:** zero data-loss incidents in first 90 days.

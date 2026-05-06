# API Spec — Wallick Work Tracker

Most data flows go through **Server Actions** (typed function calls from React). Route handlers under `/api/*` exist only for HTTP-required cases (CSV download, healthcheck, future webhooks). Both follow the same auth/validation rules.

## Conventions
- **Auth:** every action/route begins with `const user = await requireUser()` (or `requireFounder()`).
- **Validation:** every input parsed with a Zod schema from `src/lib/validations/`. Parse failures return `{ ok: false, error: 'VALIDATION', issues }`.
- **Returns:** Server Actions return either `{ ok: true, data }` or `{ ok: false, error: <code>, message? }`. Never throw across the action boundary unless the error is unexpected (those return a 500).
- **Revalidation:** mutating actions call `revalidatePath` for affected routes.

## Server Actions

### Auth
- `signIn(email, password) → { ok, redirectTo? }`
- `signOut() → { ok }`
- `requestPasswordReset(email) → { ok }` *(v1.1)*

### Users (founder only unless noted)
- `getMe() → { ok, data: User }` — any user
- `listUsers({ activeOnly?: bool }) → User[]`
- `inviteUser({ email, name, role, timezone }) → { ok, data: User }`
- `updateUser(id, { name?, role?, timezone?, isActive? }) → { ok, data: User }`
- `deactivateUser(id) → { ok }`

### Tasks
- `createTask({ title, description?, priority, assigneeId, dueDate?, estimatedMinutes? }) → Task` — founder
- `bulkCreateTasks({ task, assigneeIds[] }) → Task[]` — founder
- `updateTask(id, partial) → Task` — founder; assignee can only patch `status`
- `setTaskStatus(id, status) → Task` — assignee or founder
- `deleteTask(id) → { ok }` — founder; soft-delete
- `listTasks({ assigneeId?, status?, from?, to?, includeDeleted? }) → Task[]` — founder unless `assigneeId === me`
- `getTask(id) → Task & { workLogs, timeEntries }` — founder or assignee

### Work Logs
- `createWorkLog({ date, taskId?, freeTextTask?, description, minutes, output?, status }) → WorkLog` — own only
- `updateWorkLog(id, partial) → WorkLog` — own only, within 24h of creation
- `deleteWorkLog(id) → { ok }` — founder only
- `listWorkLogs({ userId?, from, to, taskId? }) → WorkLog[]` — own unless founder
- `myDay(date) → { logs, totalMinutes, openTasks }` — own only

### Time Entries (timer)
- `startTimer({ taskId? }) → TimeEntry` — fails with `CONFLICT` if user has an active timer
- `stopTimer({ entryId, createDraftLog?: bool }) → { entry, draftLog? }`
- `getActiveTimer() → TimeEntry | null`
- `listTimeEntries({ userId?, from, to }) → TimeEntry[]`

### Task Requests
- `createTaskRequest({ message? }) → TaskRequest` — employee
- `listTaskRequests({ status? }) → TaskRequest[]` — founder
- `fulfillTaskRequest(id, { taskInput }) → { request, task }` — founder
- `declineTaskRequest(id, { note? }) → TaskRequest` — founder

### Reports / Aggregations
- `getEmployeeOverview({ from, to, userId? }) → { totalMinutes, completedTasks, inProgressTasks, daily: [{date, minutes, tasks}] }`
- `getTeamOverview({ from, to }) → { perUser: [...], teamTotals: {...} }` — founder
- `getNoLogToday() → { users: User[] }` — founder; users without a log today after 7pm local

## HTTP Routes (`/api/*`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/export/work-logs.csv?from&to&userId?` | founder | streamed CSV |
| GET | `/api/export/tasks.csv?from&to&assigneeId?` | founder | streamed CSV |
| GET | `/api/health` | public | `{ ok: true, ts }` |

### CSV Format

`/api/export/work-logs.csv`:
```
date,user_email,user_name,task_title,task_id,description,minutes,hours,output,status
2026-05-05,alice@example.com,Alice,Build login page,clx…,Implemented form,90,1.5,PR #12 merged,DONE
```

`/api/export/tasks.csv`:
```
created_at,task_id,title,priority,status,assignee_email,assignee_name,due_date,estimated_minutes,completed_at
2026-05-04,clx…,Draft proposal,HIGH,DONE,alice@example.com,Alice,2026-05-06,120,2026-05-05T18:30:00Z
```

## Error Codes
- `UNAUTHENTICATED` — no session
- `FORBIDDEN` — wrong role
- `VALIDATION` — Zod failure (`issues` included)
- `NOT_FOUND` — id missing or soft-deleted
- `CONFLICT` — e.g., starting a timer when one is active
- `RATE_LIMIT` — only on auth endpoints (5/min/IP)
- `INTERNAL` — 500

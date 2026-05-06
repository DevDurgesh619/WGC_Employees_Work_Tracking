# Data Model — Wallick Work Tracker

## Conventions
- All ids are `cuid` strings unless stated.
- `createdAt`, `updatedAt` are `timestamptz` and managed by Prisma `@default(now())` / `@updatedAt`.
- `deletedAt` is `timestamptz?`. Non-null = soft-deleted.
- Time durations stored as `Int` minutes.
- All FKs are `onDelete: Restrict` unless stated.

## Enums

```
Role               = FOUNDER | EMPLOYEE
TaskPriority       = LOW | MEDIUM | HIGH | URGENT
TaskStatus         = NOT_STARTED | IN_PROGRESS | DONE | BLOCKED | CANCELLED
WorkLogStatus      = IN_PROGRESS | DONE
TaskRequestStatus  = OPEN | FULFILLED | DECLINED
```

## Entities

### User
| field | type | notes |
|---|---|---|
| id | string (cuid) | PK |
| supabaseUserId | string | UNIQUE; FK to Supabase `auth.users.id` |
| email | string | UNIQUE; lowercased |
| name | string | display name |
| role | Role | default `EMPLOYEE` |
| timezone | string | IANA, default `Asia/Kolkata` |
| isActive | boolean | default `true`. Inactive = cannot log in or be assigned. |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

Relations:
- `assignedTasks: Task[]` (Task.assigneeId)
- `createdTasks: Task[]` (Task.createdById)
- `workLogs: WorkLog[]`
- `timeEntries: TimeEntry[]`
- `taskRequests: TaskRequest[]`

### Task
| field | type | notes |
|---|---|---|
| id | string | PK |
| title | string | ≤120 chars |
| description | string? | ≤2000 chars |
| priority | TaskPriority | default `MEDIUM` |
| status | TaskStatus | default `NOT_STARTED` |
| assigneeId | string | FK → User |
| createdById | string | FK → User |
| dueDate | date? | local date in assignee's timezone |
| estimatedMinutes | int? | |
| startedAt | timestamptz? | first time status moved to IN_PROGRESS |
| completedAt | timestamptz? | first time status moved to DONE |
| deletedAt | timestamptz? | soft delete |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

Indexes:
- `(assigneeId, status, dueDate)` — employee task list
- `(createdById)` — founder lookups
- `(deletedAt)` — soft-delete filter

### WorkLog
| field | type | notes |
|---|---|---|
| id | string | PK |
| userId | string | FK → User (the person logging) |
| date | date | local date in user's timezone |
| taskId | string? | FK → Task. Null if free-text. |
| freeTextTask | string? | required if `taskId` is null; ≤120 chars |
| description | string | ≤2000 chars |
| minutes | int | ≥1 |
| output | string? | ≤2000 chars |
| status | WorkLogStatus | |
| deletedAt | timestamptz? | |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

Constraint: `taskId IS NOT NULL OR freeTextTask IS NOT NULL` (CHECK).

Indexes:
- `(userId, date)` — primary read pattern
- `(taskId)` — drill-down from a task
- `(date)` — admin range queries

### TimeEntry
For active timers and historical timer runs.

| field | type | notes |
|---|---|---|
| id | string | PK |
| userId | string | FK → User |
| taskId | string? | FK → Task |
| startedAt | timestamptz | |
| endedAt | timestamptz? | null = currently running |
| minutes | int? | computed on stop; null while running |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

Constraint: a partial unique index `(userId)` WHERE `endedAt IS NULL` — at most one active timer per user.

### TaskRequest
Employee asks for work when idle.

| field | type | notes |
|---|---|---|
| id | string | PK |
| requesterId | string | FK → User |
| message | string? | ≤500 chars |
| status | TaskRequestStatus | default `OPEN` |
| fulfilledByTaskId | string? | FK → Task — set when a founder creates a task in response |
| fulfilledByUserId | string? | FK → User (founder) |
| respondedAt | timestamptz? | |
| createdAt | timestamptz | |
| updatedAt | timestamptz | |

### AuditLog
Append-only.

| field | type | notes |
|---|---|---|
| id | string | PK |
| actorId | string? | FK → User; null for system actions |
| action | string | e.g., `task.create`, `worklog.delete` |
| entityType | string | `task` \| `worklog` \| … |
| entityId | string | |
| diff | jsonb? | before/after for updates |
| createdAt | timestamptz | |

## Relationship Summary
- A `User` owns many `WorkLog`, `TimeEntry`, `TaskRequest`.
- A `User` is the `assignee` of many `Task` and the `creator` of many `Task`.
- A `Task` has many `WorkLog` (zero is fine — work can be free-text) and many `TimeEntry`.
- A `TaskRequest` may resolve to one `Task`.
- `AuditLog` references entities by id+type, not FK (so we can audit deletes).

## Row-Level Security (Supabase)
Enable RLS on all tables. Policy outline:

```
-- users
SELECT: role = 'FOUNDER' OR id = auth_user_id()
INSERT/UPDATE/DELETE: role = 'FOUNDER'

-- tasks
SELECT: role = 'FOUNDER' OR assigneeId = auth_user_id() OR createdById = auth_user_id()
INSERT: role = 'FOUNDER'
UPDATE: role = 'FOUNDER' OR (assigneeId = auth_user_id() AND only fields {status} changed)
DELETE: role = 'FOUNDER'

-- work_logs
SELECT: role = 'FOUNDER' OR userId = auth_user_id()
INSERT: userId = auth_user_id()
UPDATE: userId = auth_user_id() AND createdAt > now() - interval '24 hours'
DELETE: role = 'FOUNDER'

-- time_entries
SELECT/INSERT/UPDATE/DELETE: userId = auth_user_id() OR role = 'FOUNDER'

-- task_requests
SELECT: role = 'FOUNDER' OR requesterId = auth_user_id()
INSERT: requesterId = auth_user_id()
UPDATE: role = 'FOUNDER'
```

Implement with a SQL helper `auth_user_id()` that joins `auth.uid()` to `users.supabase_user_id`.

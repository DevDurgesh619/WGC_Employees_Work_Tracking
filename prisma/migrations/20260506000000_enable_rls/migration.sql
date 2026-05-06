-- Defense-in-depth: the app already enforces RBAC at the Server Action layer,
-- and Prisma connects with the full-privilege role from the pooler so it
-- bypasses RLS by design. These policies kick in when *any* future code path
-- (an Edge function, a direct supabase-js client, a misconfigured connection)
-- talks to the DB as `authenticated` instead of `service_role`.
--
-- Policy outline mirrors DATA_MODEL.md §"Row-Level Security".

-- Helper: auth.uid() returns the Supabase auth user id (uuid). We stored the
-- bridge to our local users table on `users.supabase_user_id`, so every
-- policy expression turns "the Supabase session" into "the row in users".
create or replace function public.auth_user_id()
returns text
language sql
stable
as $$
  select u.id
  from public.users u
  where u.supabase_user_id = auth.uid()::text
  limit 1
$$;

create or replace function public.auth_role()
returns text
language sql
stable
as $$
  select u.role::text
  from public.users u
  where u.supabase_user_id = auth.uid()::text
  limit 1
$$;

-- ---- users ----
alter table public.users enable row level security;
alter table public.users force row level security;

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select using (
    public.auth_role() = 'FOUNDER' or id = public.auth_user_id()
  );

drop policy if exists users_modify on public.users;
create policy users_modify on public.users
  for all using (public.auth_role() = 'FOUNDER')
  with check (public.auth_role() = 'FOUNDER');

-- ---- tasks ----
alter table public.tasks enable row level security;
alter table public.tasks force row level security;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (
    public.auth_role() = 'FOUNDER'
    or assignee_id = public.auth_user_id()
    or created_by_id = public.auth_user_id()
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (public.auth_role() = 'FOUNDER');

-- An employee can update their own task only to change `status`. Other field
-- changes require founder role. Postgres can't easily express "only this
-- column changed", so we keep the policy permissive on update for the
-- assignee and rely on the Server Action to gate non-status fields. Founders
-- pass through unconditionally.
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (
    public.auth_role() = 'FOUNDER' or assignee_id = public.auth_user_id()
  ) with check (
    public.auth_role() = 'FOUNDER' or assignee_id = public.auth_user_id()
  );

drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (public.auth_role() = 'FOUNDER');

-- ---- work_logs ----
alter table public.work_logs enable row level security;
alter table public.work_logs force row level security;

drop policy if exists work_logs_select on public.work_logs;
create policy work_logs_select on public.work_logs
  for select using (
    public.auth_role() = 'FOUNDER' or user_id = public.auth_user_id()
  );

drop policy if exists work_logs_insert on public.work_logs;
create policy work_logs_insert on public.work_logs
  for insert with check (user_id = public.auth_user_id());

-- 24-hour edit window is a Server Action concern; here we just lock the
-- ownership constraint so an employee can't update someone else's row.
drop policy if exists work_logs_update on public.work_logs;
create policy work_logs_update on public.work_logs
  for update using (user_id = public.auth_user_id())
  with check (user_id = public.auth_user_id());

-- Soft delete via update is owned by the founder.
drop policy if exists work_logs_delete on public.work_logs;
create policy work_logs_delete on public.work_logs
  for delete using (public.auth_role() = 'FOUNDER');

-- ---- time_entries ----
alter table public.time_entries enable row level security;
alter table public.time_entries force row level security;

drop policy if exists time_entries_owner on public.time_entries;
create policy time_entries_owner on public.time_entries
  for all using (
    public.auth_role() = 'FOUNDER' or user_id = public.auth_user_id()
  ) with check (
    public.auth_role() = 'FOUNDER' or user_id = public.auth_user_id()
  );

-- ---- task_requests ----
alter table public.task_requests enable row level security;
alter table public.task_requests force row level security;

drop policy if exists task_requests_select on public.task_requests;
create policy task_requests_select on public.task_requests
  for select using (
    public.auth_role() = 'FOUNDER' or requester_id = public.auth_user_id()
  );

drop policy if exists task_requests_insert on public.task_requests;
create policy task_requests_insert on public.task_requests
  for insert with check (requester_id = public.auth_user_id());

drop policy if exists task_requests_update on public.task_requests;
create policy task_requests_update on public.task_requests
  for update using (public.auth_role() = 'FOUNDER')
  with check (public.auth_role() = 'FOUNDER');

drop policy if exists task_requests_delete on public.task_requests;
create policy task_requests_delete on public.task_requests
  for delete using (public.auth_role() = 'FOUNDER');

-- ---- audit_logs ----
-- Append-only from the application. Reads only by founders; writes go via
-- service role. RLS denies everything else.
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

drop policy if exists audit_logs_select on public.audit_logs;
create policy audit_logs_select on public.audit_logs
  for select using (public.auth_role() = 'FOUNDER');

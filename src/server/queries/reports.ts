import "server-only";

import { Prisma, Role, TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { toIsoDate } from "@/lib/time";

const OPEN_STATUSES: TaskStatus[] = [
  TaskStatus.NOT_STARTED,
  TaskStatus.IN_PROGRESS,
  TaskStatus.BLOCKED,
];

export type TeamOverviewRange = {
  from: Date;
  to: Date;
  todayIso: string;
};

export type TeamOverviewUser = {
  user: { id: string; name: string; email: string };
  totalMinutes: number;
  openTasks: number;
  inProgressTasks: number;
  completedTasksInRange: number;
  hasLoggedToday: boolean;
  daily: { date: string; minutes: number }[];
};

export type TeamOverview = {
  range: TeamOverviewRange;
  perUser: TeamOverviewUser[];
  teamTotals: {
    totalMinutes: number;
    totalEmployees: number;
    activeEmployeesToday: number;
  };
};

// One round-trip per source (work_logs aggregate, tasks groupBy, employees list).
// Avoids N+1 loops over users at the cost of stitching on the Node side.
export async function getTeamOverview(input: {
  from: Date;
  to: Date;
  todayIso?: string;
}): Promise<TeamOverview> {
  const { from, to } = input;
  const todayIso = input.todayIso ?? toIsoDate(new Date());

  const employees = await prisma.user.findMany({
    where: { role: Role.EMPLOYEE, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const employeeIds = employees.map((e) => e.id);

  if (employeeIds.length === 0) {
    return {
      range: { from, to, todayIso },
      perUser: [],
      teamTotals: { totalMinutes: 0, totalEmployees: 0, activeEmployeesToday: 0 },
    };
  }

  // group_by user_id, date ⇒ minutes per user per day, for the range.
  const dailyRows = await prisma.workLog.groupBy({
    by: ["userId", "date"],
    where: {
      userId: { in: employeeIds },
      deletedAt: null,
      date: { gte: from, lte: to },
    },
    _sum: { minutes: true },
  });

  const dailyByUser = new Map<string, { date: string; minutes: number }[]>();
  const userTotals = new Map<string, number>();
  const loggedTodayUsers = new Set<string>();

  for (const row of dailyRows) {
    const iso = toIsoDate(row.date);
    const minutes = row._sum.minutes ?? 0;
    if (minutes <= 0) continue;
    const cur = dailyByUser.get(row.userId) ?? [];
    cur.push({ date: iso, minutes });
    dailyByUser.set(row.userId, cur);
    userTotals.set(row.userId, (userTotals.get(row.userId) ?? 0) + minutes);
    if (iso === todayIso) loggedTodayUsers.add(row.userId);
  }

  // Open + in-progress task counts, in one groupBy.
  const taskCounts = await prisma.task.groupBy({
    by: ["assigneeId", "status"],
    where: {
      assigneeId: { in: employeeIds },
      deletedAt: null,
      status: { in: OPEN_STATUSES },
    },
    _count: { _all: true },
  });

  const openByUser = new Map<string, { open: number; inProgress: number }>();
  for (const c of taskCounts) {
    const cur = openByUser.get(c.assigneeId) ?? { open: 0, inProgress: 0 };
    cur.open += c._count._all;
    if (c.status === TaskStatus.IN_PROGRESS) cur.inProgress += c._count._all;
    openByUser.set(c.assigneeId, cur);
  }

  // Tasks completed inside the range (completedAt within [from..to]).
  const completedRows = await prisma.task.groupBy({
    by: ["assigneeId"],
    where: {
      assigneeId: { in: employeeIds },
      deletedAt: null,
      status: TaskStatus.DONE,
      completedAt: { gte: from, lte: endOfDay(to) },
    },
    _count: { _all: true },
  });
  const completedByUser = new Map<string, number>(
    completedRows.map((r) => [r.assigneeId, r._count._all]),
  );

  const perUser: TeamOverviewUser[] = employees.map((emp) => {
    const daily = (dailyByUser.get(emp.id) ?? []).sort((a, b) => a.date.localeCompare(b.date));
    return {
      user: emp,
      totalMinutes: userTotals.get(emp.id) ?? 0,
      openTasks: openByUser.get(emp.id)?.open ?? 0,
      inProgressTasks: openByUser.get(emp.id)?.inProgress ?? 0,
      completedTasksInRange: completedByUser.get(emp.id) ?? 0,
      hasLoggedToday: loggedTodayUsers.has(emp.id),
      daily,
    };
  });

  const teamTotalMinutes = Array.from(userTotals.values()).reduce((s, n) => s + n, 0);

  return {
    range: { from, to, todayIso },
    perUser,
    teamTotals: {
      totalMinutes: teamTotalMinutes,
      totalEmployees: employees.length,
      activeEmployeesToday: loggedTodayUsers.size,
    },
  };
}

function endOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

// Drill-down: a single employee's window of work + tasks + timer history.
export async function getEmployeeWindow(input: { userId: string; from: Date; to: Date }) {
  const { userId, from, to } = input;
  const [user, logs, tasks, timeEntries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true, timezone: true },
    }),
    prisma.workLog.findMany({
      where: { userId, deletedAt: null, date: { gte: from, lte: to } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { task: { select: { id: true, title: true } } },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.timeEntry.findMany({
      where: {
        userId,
        startedAt: { gte: from, lte: endOfDay(to) },
      },
      orderBy: { startedAt: "desc" },
      include: { task: { select: { id: true, title: true } } },
    }),
  ]);

  const totalMinutes = logs.reduce((s, l) => s + l.minutes, 0);
  return { user, logs, tasks, timeEntries, totalMinutes };
}

export type EmployeeWindow = Awaited<ReturnType<typeof getEmployeeWindow>>;

// Helpers shared with /admin/overview & /admin/employees pages.
//
// Work logs store `date` as UTC-midnight matching the user's LOCAL date
// (the form sends "YYYY-MM-DD" and we coerce to Date.UTC of those parts).
// So all range maths must be done in local components, otherwise a log
// written at 9pm IST ("today" locally) lands outside a UTC-derived range
// because UTC has rolled back a day.
export function todayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function startOfRangeDays(daysBack: number): Date {
  return new Date(todayUtcMidnight().getTime() - daysBack * 24 * 60 * 60 * 1000);
}

// Named export Prisma helper namespace use for downstream join hints if needed.
export { Prisma };

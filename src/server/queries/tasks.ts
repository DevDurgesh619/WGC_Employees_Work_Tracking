import "server-only";

import { Prisma, type Task, TaskPriority, type User } from "@prisma/client";

import { prisma } from "@/lib/db";
import type { ListTasksFilter } from "@/lib/validations/task";

// Order: priority high→low, then due date asc (nulls last), then created desc.
// Done client-side in JS because Prisma doesn't expose `nulls last` for
// indexed orderBy without raw SQL, and the per-user list is small.
const PRIORITY_RANK: Record<TaskPriority, number> = {
  [TaskPriority.URGENT]: 0,
  [TaskPriority.HIGH]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 3,
};

function sortTasks<T extends Pick<Task, "priority" | "dueDate" | "createdAt">>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function buildWhere(filter: ListTasksFilter): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};
  if (!filter.includeDeleted) where.deletedAt = null;
  if (filter.assigneeId) where.assigneeId = filter.assigneeId;
  if (filter.status) where.status = filter.status;
  if (filter.from || filter.to) {
    where.dueDate = {};
    if (filter.from) where.dueDate.gte = filter.from;
    if (filter.to) where.dueDate.lte = filter.to;
  }
  return where;
}

export async function listTasksForUser(userId: User["id"], filter: ListTasksFilter = {}) {
  const where = buildWhere({ ...filter, assigneeId: userId });
  const rows = await prisma.task.findMany({ where });
  return sortTasks(rows);
}

export async function getTeamTasks(filter: ListTasksFilter = {}) {
  const where = buildWhere(filter);
  const rows = await prisma.task.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });
  return sortTasks(rows);
}

export type TaskWithAssignee = Awaited<ReturnType<typeof getTeamTasks>>[number];

export async function getTaskById(id: Task["id"]) {
  return prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      workLogs: {
        where: { deletedAt: null },
        orderBy: { date: "desc" },
        select: { id: true, date: true, minutes: true, description: true, status: true },
      },
      timeEntries: {
        orderBy: { startedAt: "desc" },
        select: { id: true, startedAt: true, endedAt: true, minutes: true },
      },
    },
  });
}

export type TaskDetail = Awaited<ReturnType<typeof getTaskById>>;

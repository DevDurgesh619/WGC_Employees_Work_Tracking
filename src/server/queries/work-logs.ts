import "server-only";

import { TaskStatus, type User } from "@prisma/client";

import { prisma } from "@/lib/db";

const OPEN_STATUSES = [TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED];

export async function listMyLogs(userId: User["id"], date: Date) {
  return prisma.workLog.findMany({
    where: { userId, deletedAt: null, date },
    orderBy: { createdAt: "desc" },
    include: {
      task: { select: { id: true, title: true } },
    },
  });
}

export type MyLogRow = Awaited<ReturnType<typeof listMyLogs>>[number];

export async function getMyDay(userId: User["id"], date: Date) {
  const [logs, totals, openTasks] = await Promise.all([
    listMyLogs(userId, date),
    prisma.workLog.aggregate({
      where: { userId, deletedAt: null, date },
      _sum: { minutes: true },
    }),
    prisma.task.count({
      where: {
        assigneeId: userId,
        deletedAt: null,
        status: { in: OPEN_STATUSES },
      },
    }),
  ]);

  return {
    logs,
    totalMinutes: totals._sum.minutes ?? 0,
    openTasks,
  };
}

export type MyDay = Awaited<ReturnType<typeof getMyDay>>;

export async function listMyLogsRange(userId: User["id"], from: Date, to: Date) {
  return prisma.workLog.findMany({
    where: {
      userId,
      deletedAt: null,
      date: { gte: from, lte: to },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      task: { select: { id: true, title: true } },
    },
  });
}

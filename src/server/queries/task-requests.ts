import "server-only";

import { TaskRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/db";

const REQUESTER_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

// Founder queue. Ordered open-first, newest within status.
export async function listTaskRequests(input: { status?: TaskRequestStatus } = {}) {
  return prisma.taskRequest.findMany({
    where: input.status ? { status: input.status } : undefined,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      requester: { select: REQUESTER_SELECT },
      fulfilledByTask: { select: { id: true, title: true, status: true } },
      fulfilledByUser: { select: { id: true, name: true } },
    },
  });
}

export type TaskRequestListItem = Awaited<ReturnType<typeof listTaskRequests>>[number];

// Employee dashboard "my requests" — only the requester's own.
export async function listMyTaskRequests(userId: string) {
  return prisma.taskRequest.findMany({
    where: { requesterId: userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      fulfilledByTask: { select: { id: true, title: true, status: true } },
      fulfilledByUser: { select: { id: true, name: true } },
    },
  });
}

export type MyTaskRequestListItem = Awaited<ReturnType<typeof listMyTaskRequests>>[number];

export async function countOpenTaskRequests(): Promise<number> {
  return prisma.taskRequest.count({ where: { status: TaskRequestStatus.OPEN } });
}

// Used by the dashboard "Request task" button to short-circuit duplicate asks.
export async function getOpenTaskRequestForUser(userId: string) {
  return prisma.taskRequest.findFirst({
    where: { requesterId: userId, status: TaskRequestStatus.OPEN },
    orderBy: { createdAt: "desc" },
  });
}

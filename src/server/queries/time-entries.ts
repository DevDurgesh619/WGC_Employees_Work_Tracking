import "server-only";

import type { User } from "@prisma/client";

import { prisma } from "@/lib/db";

export async function getActiveTimerForUser(userId: User["id"]) {
  return prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
    include: { task: { select: { id: true, title: true } } },
  });
}

export type ActiveTimer = NonNullable<Awaited<ReturnType<typeof getActiveTimerForUser>>>;

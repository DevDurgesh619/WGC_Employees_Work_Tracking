"use server";

import { revalidatePath } from "next/cache";

import { Prisma, type TimeEntry, type WorkLog } from "@prisma/client";

import { requireEmployee } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayIsoDate } from "@/lib/time";
import {
  discardTimerSchema,
  startTimerSchema,
  stopTimerSchema,
} from "@/lib/validations/time-entry";
import type { ActionResult } from "@/types/api";
import { getActiveTimerForUser } from "@/server/queries/time-entries";

function revalidateTimerRoutes() {
  revalidatePath("/dashboard");
  revalidatePath("/log");
}

export async function startTimer(input: unknown): Promise<ActionResult<TimeEntry>> {
  const user = await requireEmployee();
  const parsed = startTimerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { taskId } = parsed.data;

  if (taskId) {
    const task = await prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: { id: true, assigneeId: true },
    });
    if (!task) return { ok: false, error: "NOT_FOUND", message: "Task not found." };
    if (task.assigneeId !== user.id) {
      return { ok: false, error: "FORBIDDEN", message: "Not your task." };
    }
  }

  // Race-safe via the partial unique index on time_entries(user_id) WHERE
  // ended_at IS NULL — a second concurrent insert raises P2002.
  try {
    const entry = await prisma.timeEntry.create({
      data: {
        userId: user.id,
        taskId: taskId ?? null,
        startedAt: new Date(),
      },
    });
    revalidateTimerRoutes();
    return { ok: true, data: entry };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return {
        ok: false,
        error: "CONFLICT",
        message: "A timer is already running on another device.",
      };
    }
    throw err;
  }
}

export type StopTimerData = {
  entry: TimeEntry;
  workLog: WorkLog;
};

export async function stopTimer(input: unknown): Promise<ActionResult<StopTimerData>> {
  const user = await requireEmployee();
  const parsed = stopTimerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { entryId, workLog } = parsed.data;

  const existing = await prisma.timeEntry.findFirst({
    where: { id: entryId },
    select: { id: true, userId: true, endedAt: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (existing.userId !== user.id) return { ok: false, error: "FORBIDDEN" };
  if (existing.endedAt) {
    return { ok: false, error: "VALIDATION", message: "Timer already stopped." };
  }

  if (workLog.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: workLog.taskId, deletedAt: null },
      select: { id: true, assigneeId: true },
    });
    if (!task) return { ok: false, error: "NOT_FOUND", message: "Task not found." };
    if (task.assigneeId !== user.id) {
      return { ok: false, error: "FORBIDDEN", message: "Not your task." };
    }
  }

  const endedAt = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const entry = await tx.timeEntry.update({
      where: { id: entryId },
      data: { endedAt, minutes: workLog.minutes },
    });

    const log = await tx.workLog.create({
      data: {
        userId: user.id,
        date: new Date(`${todayIsoDate()}T00:00:00.000Z`),
        taskId: workLog.taskId ?? null,
        freeTextTask: workLog.taskId ? null : workLog.freeTextTask ?? null,
        description: workLog.description,
        minutes: workLog.minutes,
        output: workLog.output ?? null,
        status: workLog.status,
      },
    });

    return { entry, workLog: log };
  });

  revalidateTimerRoutes();
  return { ok: true, data: result };
}

export async function discardTimer(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireEmployee();
  const parsed = discardTimerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { entryId } = parsed.data;

  const existing = await prisma.timeEntry.findFirst({
    where: { id: entryId },
    select: { id: true, userId: true, endedAt: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (existing.userId !== user.id) return { ok: false, error: "FORBIDDEN" };
  if (existing.endedAt) {
    return { ok: false, error: "VALIDATION", message: "Timer already stopped." };
  }

  // Hard delete — discard means "as if it never ran." No analytics signal needed.
  await prisma.timeEntry.delete({ where: { id: entryId } });

  revalidateTimerRoutes();
  return { ok: true, data: { id: entryId } };
}

export async function getActiveTimer() {
  const user = await requireEmployee();
  return getActiveTimerForUser(user.id);
}

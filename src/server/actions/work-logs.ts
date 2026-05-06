"use server";

import { revalidatePath } from "next/cache";

import type { WorkLog } from "@prisma/client";

import { requireEmployee, requireFounder } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createWorkLogSchema,
  isWithinEditWindow,
  updateWorkLogSchema,
} from "@/lib/validations/work-log";
import { writeAudit } from "@/server/audit";
import type { ActionResult, ErrorCode } from "@/types/api";
import type { z } from "zod";

function validationError(issues: z.ZodIssue[]): { ok: false; error: ErrorCode; message: string } {
  return {
    ok: false,
    error: "VALIDATION",
    message: issues[0]?.message ?? "Invalid input.",
  };
}

function revalidateLogRoutes() {
  revalidatePath("/log");
  revalidatePath("/dashboard");
  revalidatePath("/admin/overview");
}

export async function createWorkLog(input: unknown): Promise<ActionResult<WorkLog>> {
  const user = await requireEmployee();
  const parsed = createWorkLogSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const data = parsed.data;

  // If linked to a task, ensure the user is the assignee.
  if (data.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, deletedAt: null },
      select: { id: true, assigneeId: true },
    });
    if (!task) return { ok: false, error: "NOT_FOUND", message: "Task not found." };
    if (task.assigneeId !== user.id) {
      return { ok: false, error: "FORBIDDEN", message: "Not your task." };
    }
  }

  const created = await prisma.workLog.create({
    data: {
      userId: user.id,
      date: data.date,
      taskId: data.taskId ?? null,
      freeTextTask: data.taskId ? null : data.freeTextTask ?? null,
      description: data.description,
      minutes: data.minutes,
      output: data.output ?? null,
      status: data.status,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "worklog.create",
    entityType: "worklog",
    entityId: created.id,
    diff: { taskId: created.taskId, minutes: created.minutes, status: created.status },
  });

  revalidateLogRoutes();
  return { ok: true, data: created };
}

export async function updateWorkLog(id: string, input: unknown): Promise<ActionResult<WorkLog>> {
  const user = await requireEmployee();
  const parsed = updateWorkLogSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const existing = await prisma.workLog.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      userId: true,
      taskId: true,
      freeTextTask: true,
      createdAt: true,
    },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (existing.userId !== user.id) return { ok: false, error: "FORBIDDEN", message: "Not your log." };
  if (!isWithinEditWindow(existing.createdAt)) {
    return { ok: false, error: "FORBIDDEN", message: "Edit window (24h) has closed." };
  }

  const patch = parsed.data;

  // Re-check the task XOR free-text invariant against the merged row.
  const mergedTaskId = patch.taskId === undefined ? existing.taskId : patch.taskId;
  const mergedFreeText =
    patch.freeTextTask === undefined ? existing.freeTextTask : patch.freeTextTask;
  if (!mergedTaskId && !mergedFreeText) {
    return {
      ok: false,
      error: "VALIDATION",
      message: "A log must reference a task or carry free-text.",
    };
  }
  if (mergedTaskId && mergedFreeText) {
    return {
      ok: false,
      error: "VALIDATION",
      message: "Use either a task or free text — not both.",
    };
  }

  if (patch.taskId) {
    const task = await prisma.task.findFirst({
      where: { id: patch.taskId, deletedAt: null },
      select: { id: true, assigneeId: true },
    });
    if (!task) return { ok: false, error: "NOT_FOUND", message: "Task not found." };
    if (task.assigneeId !== user.id) {
      return { ok: false, error: "FORBIDDEN", message: "Not your task." };
    }
  }

  const updated = await prisma.workLog.update({
    where: { id },
    data: {
      date: patch.date,
      taskId: patch.taskId,
      freeTextTask: patch.freeTextTask,
      description: patch.description,
      minutes: patch.minutes,
      output: patch.output,
      status: patch.status,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: "worklog.update",
    entityType: "worklog",
    entityId: id,
    diff: { taskId: updated.taskId, minutes: updated.minutes, status: updated.status },
  });

  revalidateLogRoutes();
  return { ok: true, data: updated };
}

export async function deleteWorkLog(id: string): Promise<ActionResult<{ id: string }>> {
  const founder = await requireFounder();
  const existing = await prisma.workLog.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, userId: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  await prisma.workLog.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await writeAudit({
    actorId: founder.id,
    action: "worklog.delete",
    entityType: "worklog",
    entityId: id,
    diff: { ownerId: existing.userId },
  });

  revalidateLogRoutes();
  return { ok: true, data: { id } };
}

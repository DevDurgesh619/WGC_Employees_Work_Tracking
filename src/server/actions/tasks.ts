"use server";

import { revalidatePath } from "next/cache";

import { TaskStatus, type Task } from "@prisma/client";
import { z } from "zod";

import { requireFounder, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canDeleteTask } from "@/lib/rbac";
import {
  bulkCreateTasksSchema,
  canTransitionTaskStatus,
  createTaskSchema,
  setTaskStatusSchema,
  updateTaskSchema,
} from "@/lib/validations/task";
import { diffOf, writeAudit } from "@/server/audit";
import type { ActionResult, ErrorCode } from "@/types/api";

type Issues = z.ZodIssue[];

function validationError(issues: Issues): { ok: false; error: ErrorCode; message: string } {
  return {
    ok: false,
    error: "VALIDATION",
    message: issues[0]?.message ?? "Invalid input.",
  };
}

function revalidateTaskRoutes(taskId?: string) {
  revalidatePath("/tasks");
  revalidatePath("/admin/overview");
  revalidatePath("/admin/assign");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

// Side-effect helper: keep startedAt/completedAt timestamps in sync with status.
// Called whenever status moves; first transition into IN_PROGRESS / DONE wins.
function statusTimestampPatch(
  task: Pick<Task, "status" | "startedAt" | "completedAt">,
  next: TaskStatus,
): { startedAt?: Date; completedAt?: Date | null } {
  const patch: { startedAt?: Date; completedAt?: Date | null } = {};
  if (next === TaskStatus.IN_PROGRESS && !task.startedAt) {
    patch.startedAt = new Date();
  }
  if (next === TaskStatus.DONE && !task.completedAt) {
    patch.completedAt = new Date();
    if (!task.startedAt) patch.startedAt = new Date();
  }
  // Re-opening a DONE task wipes completedAt so completion analytics stay honest.
  if (task.completedAt && next !== TaskStatus.DONE) {
    patch.completedAt = null;
  }
  return patch;
}

export async function createTask(input: unknown): Promise<ActionResult<Task>> {
  const founder = await requireFounder();
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const data = parsed.data;
  const assignee = await prisma.user.findFirst({
    where: { id: data.assigneeId, isActive: true },
    select: { id: true },
  });
  if (!assignee) {
    return { ok: false, error: "NOT_FOUND", message: "Assignee not found or inactive." };
  }

  const created = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority,
      assigneeId: data.assigneeId,
      createdById: founder.id,
      dueDate: data.dueDate,
      estimatedMinutes: data.estimatedMinutes,
    },
  });

  await writeAudit({
    actorId: founder.id,
    action: "task.create",
    entityType: "task",
    entityId: created.id,
    diff: { assigneeId: created.assigneeId, title: created.title },
  });

  revalidateTaskRoutes();
  return { ok: true, data: created };
}

export async function bulkCreateTasks(input: unknown): Promise<ActionResult<Task[]>> {
  const founder = await requireFounder();
  const parsed = bulkCreateTasksSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const { task, assigneeIds } = parsed.data;
  const activeAssignees = await prisma.user.findMany({
    where: { id: { in: assigneeIds }, isActive: true },
    select: { id: true },
  });
  if (activeAssignees.length !== assigneeIds.length) {
    return {
      ok: false,
      error: "NOT_FOUND",
      message: "One or more assignees are missing or inactive.",
    };
  }

  const created = await prisma.$transaction(
    assigneeIds.map((assigneeId) =>
      prisma.task.create({
        data: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          assigneeId,
          createdById: founder.id,
          dueDate: task.dueDate,
          estimatedMinutes: task.estimatedMinutes,
        },
      }),
    ),
  );

  await Promise.all(
    created.map((t) =>
      writeAudit({
        actorId: founder.id,
        action: "task.create",
        entityType: "task",
        entityId: t.id,
        diff: { assigneeId: t.assigneeId, title: t.title, batch: true },
      }),
    ),
  );

  revalidateTaskRoutes();
  return { ok: true, data: created };
}

export async function updateTask(id: string, input: unknown): Promise<ActionResult<Task>> {
  const founder = await requireFounder();
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const existing = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      title: true,
      priority: true,
      assigneeId: true,
      dueDate: true,
    },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const patch = parsed.data;
  if (patch.status && !canTransitionTaskStatus(existing.status, patch.status)) {
    return {
      ok: false,
      error: "VALIDATION",
      message: `Cannot move task from ${existing.status} to ${patch.status}.`,
    };
  }

  const stamps = patch.status ? statusTimestampPatch(existing, patch.status) : {};
  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...patch,
      ...stamps,
    },
  });

  await writeAudit({
    actorId: founder.id,
    action: "task.update",
    entityType: "task",
    entityId: id,
    diff: diffOf(
      {
        title: existing.title,
        priority: existing.priority,
        assigneeId: existing.assigneeId,
        status: existing.status,
      },
      {
        title: updated.title,
        priority: updated.priority,
        assigneeId: updated.assigneeId,
        status: updated.status,
      },
    ),
  });

  revalidateTaskRoutes(id);
  return { ok: true, data: updated };
}

export async function setTaskStatus(id: string, input: unknown): Promise<ActionResult<Task>> {
  const user = await requireUser();
  const parsed = setTaskStatusSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);
  const next = parsed.data.status;

  const existing = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      assigneeId: true,
      createdById: true,
    },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  const isAuthorised =
    user.role === "FOUNDER" ||
    existing.assigneeId === user.id ||
    existing.createdById === user.id;
  if (!isAuthorised) return { ok: false, error: "FORBIDDEN" };

  if (!canTransitionTaskStatus(existing.status, next)) {
    return {
      ok: false,
      error: "VALIDATION",
      message: `Cannot move task from ${existing.status} to ${next}.`,
    };
  }

  const stamps = statusTimestampPatch(existing, next);
  const updated = await prisma.task.update({
    where: { id },
    data: { status: next, ...stamps },
  });

  await writeAudit({
    actorId: user.id,
    action: "task.status",
    entityType: "task",
    entityId: id,
    diff: { status: { from: existing.status, to: next } },
  });

  revalidateTaskRoutes(id);
  return { ok: true, data: updated };
}

export async function deleteTask(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (!canDeleteTask(user)) return { ok: false, error: "FORBIDDEN" };

  const existing = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };

  await prisma.task.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await writeAudit({
    actorId: user.id,
    action: "task.delete",
    entityType: "task",
    entityId: id,
  });

  revalidateTaskRoutes(id);
  return { ok: true, data: { id } };
}

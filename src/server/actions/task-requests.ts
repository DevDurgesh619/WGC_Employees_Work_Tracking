"use server";

import { revalidatePath } from "next/cache";

import { TaskRequestStatus, type Task, type TaskRequest } from "@prisma/client";
import { z } from "zod";

import { requireEmployee, requireFounder } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createTaskRequestSchema,
  declineTaskRequestSchema,
  fulfillTaskRequestSchema,
} from "@/lib/validations/task-request";
import type { ActionResult, ErrorCode } from "@/types/api";

function validationError(issues: z.ZodIssue[]): { ok: false; error: ErrorCode; message: string } {
  return {
    ok: false,
    error: "VALIDATION",
    message: issues[0]?.message ?? "Invalid input.",
  };
}

function revalidateRequestRoutes() {
  revalidatePath("/dashboard");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/overview");
  revalidatePath("/tasks");
}

export async function createTaskRequest(input: unknown): Promise<ActionResult<TaskRequest>> {
  const user = await requireEmployee();
  const parsed = createTaskRequestSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  // One open request per employee at a time. Avoids spammy duplicates and
  // gives the dashboard a clean "you have a pending request" surface.
  const existing = await prisma.taskRequest.findFirst({
    where: { requesterId: user.id, status: TaskRequestStatus.OPEN },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      error: "CONFLICT",
      message: "You already have an open task request.",
    };
  }

  const created = await prisma.taskRequest.create({
    data: {
      requesterId: user.id,
      message: parsed.data.message ?? null,
    },
  });

  revalidateRequestRoutes();
  return { ok: true, data: created };
}

export type FulfillTaskRequestData = {
  request: TaskRequest;
  task: Task;
};

export async function fulfillTaskRequest(
  id: string,
  input: unknown,
): Promise<ActionResult<FulfillTaskRequestData>> {
  const founder = await requireFounder();
  const parsed = fulfillTaskRequestSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const request = await prisma.taskRequest.findUnique({
    where: { id },
    select: { id: true, status: true, requesterId: true },
  });
  if (!request) return { ok: false, error: "NOT_FOUND" };
  if (request.status !== TaskRequestStatus.OPEN) {
    return { ok: false, error: "VALIDATION", message: "Request is no longer open." };
  }

  const requester = await prisma.user.findFirst({
    where: { id: request.requesterId, isActive: true },
    select: { id: true },
  });
  if (!requester) {
    return { ok: false, error: "NOT_FOUND", message: "Requester is inactive or missing." };
  }

  const taskInput = parsed.data.task;

  // Single transaction: the new task and the request resolution must land
  // together, otherwise a fulfilled request could point at a non-existent task.
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.create({
      data: {
        title: taskInput.title,
        description: taskInput.description,
        priority: taskInput.priority,
        assigneeId: requester.id,
        createdById: founder.id,
        dueDate: taskInput.dueDate,
        estimatedMinutes: taskInput.estimatedMinutes,
      },
    });

    const updated = await tx.taskRequest.update({
      where: { id },
      data: {
        status: TaskRequestStatus.FULFILLED,
        fulfilledByTaskId: task.id,
        fulfilledByUserId: founder.id,
        respondedAt: new Date(),
      },
    });

    return { request: updated, task };
  });

  revalidateRequestRoutes();
  return { ok: true, data: result };
}

export async function declineTaskRequest(
  id: string,
  input: unknown,
): Promise<ActionResult<TaskRequest>> {
  const founder = await requireFounder();
  const parsed = declineTaskRequestSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error.issues);

  const existing = await prisma.taskRequest.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) return { ok: false, error: "NOT_FOUND" };
  if (existing.status !== TaskRequestStatus.OPEN) {
    return { ok: false, error: "VALIDATION", message: "Request is no longer open." };
  }

  const updated = await prisma.taskRequest.update({
    where: { id },
    data: {
      status: TaskRequestStatus.DECLINED,
      declineReason: parsed.data.reason ?? null,
      fulfilledByUserId: founder.id,
      respondedAt: new Date(),
    },
  });

  revalidateRequestRoutes();
  return { ok: true, data: updated };
}

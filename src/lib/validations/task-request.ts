import { TaskRequestStatus } from "@prisma/client";
import { z } from "zod";

import { createTaskSchema } from "./task";

const MESSAGE_MAX = 500;
const DECLINE_REASON_MAX = 500;

export const taskRequestStatusSchema = z.nativeEnum(TaskRequestStatus);

const optionalText = (max: number, label: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .trim()
      .max(max, { message: `${label} must be ${max} characters or fewer.` })
      .optional(),
  );

export const createTaskRequestSchema = z.object({
  message: optionalText(MESSAGE_MAX, "Message"),
});

export type CreateTaskRequestInput = z.infer<typeof createTaskRequestSchema>;

export const listTaskRequestsFilterSchema = z.object({
  status: taskRequestStatusSchema.optional(),
});

export type ListTaskRequestsFilter = z.infer<typeof listTaskRequestsFilterSchema>;

// Fulfilling a request creates a fresh task targeted at the requester. The
// founder picks priority/due date/etc. — assigneeId is forced to the requester
// server-side, so we omit it from the input shape entirely.
export const fulfillTaskRequestSchema = z.object({
  task: createTaskSchema.omit({ assigneeId: true }),
});

export type FulfillTaskRequestInput = z.infer<typeof fulfillTaskRequestSchema>;

export const declineTaskRequestSchema = z.object({
  reason: optionalText(DECLINE_REASON_MAX, "Reason"),
});

export type DeclineTaskRequestInput = z.infer<typeof declineTaskRequestSchema>;

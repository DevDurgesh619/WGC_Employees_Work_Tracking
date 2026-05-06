import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

// Stay aligned with prisma/schema.prisma — same caps and enum values.
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

export const taskPrioritySchema = z.nativeEnum(TaskPriority);
export const taskStatusSchema = z.nativeEnum(TaskStatus);

const titleSchema = z
  .string()
  .trim()
  .min(1, { message: "Title is required." })
  .max(TITLE_MAX, { message: `Title must be ${TITLE_MAX} characters or fewer.` });

const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX, { message: `Description must be ${DESCRIPTION_MAX} characters or fewer.` })
  .optional()
  .or(z.literal("").transform(() => undefined));

const dueDateSchema = z
  .union([z.coerce.date(), z.string().length(0)])
  .transform((v) => (v instanceof Date ? v : undefined))
  .optional();

const estimatedMinutesSchema = z
  .union([z.coerce.number().int().positive(), z.string().length(0)])
  .transform((v) => (typeof v === "number" ? v : undefined))
  .optional();

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  priority: taskPrioritySchema.default(TaskPriority.MEDIUM),
  assigneeId: z.string().min(1, { message: "Assignee is required." }),
  dueDate: dueDateSchema,
  estimatedMinutes: estimatedMinutesSchema,
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const bulkCreateTasksSchema = z.object({
  task: createTaskSchema.omit({ assigneeId: true }),
  assigneeIds: z
    .array(z.string().min(1))
    .min(1, { message: "Pick at least one assignee." })
    .max(50, { message: "Too many assignees in one batch." }),
});

export type BulkCreateTasksInput = z.infer<typeof bulkCreateTasksSchema>;

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema,
    priority: taskPrioritySchema.optional(),
    assigneeId: z.string().min(1).optional(),
    dueDate: dueDateSchema,
    estimatedMinutes: estimatedMinutesSchema,
    status: taskStatusSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update.",
  });

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const setTaskStatusSchema = z.object({
  status: taskStatusSchema,
});

export type SetTaskStatusInput = z.infer<typeof setTaskStatusSchema>;

export const listTasksFilterSchema = z.object({
  assigneeId: z.string().min(1).optional(),
  status: taskStatusSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  includeDeleted: z.boolean().optional(),
});

export type ListTasksFilter = z.infer<typeof listTasksFilterSchema>;

// Status transitions — DATA_MODEL.md doesn't constrain these directly, but the
// founder dashboard cares which moves are legal. Keeping the matrix here so
// queries/actions/tests share one source of truth.
//
//   NOT_STARTED  → IN_PROGRESS, BLOCKED, CANCELLED, DONE
//   IN_PROGRESS  → DONE, BLOCKED, CANCELLED, NOT_STARTED
//   BLOCKED      → IN_PROGRESS, CANCELLED, NOT_STARTED
//   DONE         → IN_PROGRESS   (re-open if needed)
//   CANCELLED    → NOT_STARTED   (un-cancel)
const ALLOWED_STATUS_TRANSITIONS: Record<TaskStatus, ReadonlySet<TaskStatus>> = {
  [TaskStatus.NOT_STARTED]: new Set([
    TaskStatus.IN_PROGRESS,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED,
    TaskStatus.DONE,
  ]),
  [TaskStatus.IN_PROGRESS]: new Set([
    TaskStatus.DONE,
    TaskStatus.BLOCKED,
    TaskStatus.CANCELLED,
    TaskStatus.NOT_STARTED,
  ]),
  [TaskStatus.BLOCKED]: new Set([
    TaskStatus.IN_PROGRESS,
    TaskStatus.CANCELLED,
    TaskStatus.NOT_STARTED,
  ]),
  [TaskStatus.DONE]: new Set([TaskStatus.IN_PROGRESS]),
  [TaskStatus.CANCELLED]: new Set([TaskStatus.NOT_STARTED]),
};

export function canTransitionTaskStatus(from: TaskStatus, to: TaskStatus): boolean {
  if (from === to) return true;
  return ALLOWED_STATUS_TRANSITIONS[from].has(to);
}

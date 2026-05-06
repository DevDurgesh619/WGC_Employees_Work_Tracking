import { WorkLogStatus } from "@prisma/client";
import { z } from "zod";

const FREE_TEXT_MAX = 120;
const DESCRIPTION_MAX = 2000;
const OUTPUT_MAX = 2000;

export const workLogStatusSchema = z.nativeEnum(WorkLogStatus);

const dateOnlySchema = z.union([z.string().min(1), z.date()]).transform((v, ctx) => {
  // Accept "yyyy-MM-dd" or a Date; normalise to a UTC midnight Date so Postgres
  // stores it as the user's local day (Prisma maps @db.Date → UTC date column).
  if (v instanceof Date) {
    return new Date(Date.UTC(v.getFullYear(), v.getMonth(), v.getDate()));
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date must be YYYY-MM-DD." });
    return z.NEVER;
  }
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
});

const minutesSchema = z.coerce
  .number()
  .int({ message: "Minutes must be a whole number." })
  .min(1, { message: "Log at least 1 minute." })
  .max(24 * 60, { message: "A single log can't exceed 24 hours." });

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const createWorkLogSchema = z
  .object({
    date: dateOnlySchema,
    taskId: z.string().min(1).optional().or(z.literal("").transform(() => undefined)),
    freeTextTask: optionalTrimmedString(FREE_TEXT_MAX),
    description: z
      .string()
      .trim()
      .min(1, { message: "Description is required." })
      .max(DESCRIPTION_MAX),
    minutes: minutesSchema,
    output: optionalTrimmedString(OUTPUT_MAX),
    status: workLogStatusSchema.default(WorkLogStatus.DONE),
  })
  .superRefine((value, ctx) => {
    const hasTask = Boolean(value.taskId);
    const hasFreeText = Boolean(value.freeTextTask && value.freeTextTask.length > 0);

    if (!hasTask && !hasFreeText) {
      ctx.addIssue({
        path: ["freeTextTask"],
        code: z.ZodIssueCode.custom,
        message: "Pick a task or describe what you worked on.",
      });
    }
    if (hasTask && hasFreeText) {
      ctx.addIssue({
        path: ["freeTextTask"],
        code: z.ZodIssueCode.custom,
        message: "Use either a task or free text — not both.",
      });
    }
  });

export type CreateWorkLogInput = z.infer<typeof createWorkLogSchema>;

// Update is partial but still respects the "task XOR freeTextTask" invariant
// when *both* are touched. The action layer re-checks against the merged row.
export const updateWorkLogSchema = z
  .object({
    date: dateOnlySchema.optional(),
    taskId: z.string().min(1).nullable().optional(),
    freeTextTask: z.string().trim().max(FREE_TEXT_MAX).nullable().optional(),
    description: z.string().trim().min(1).max(DESCRIPTION_MAX).optional(),
    minutes: minutesSchema.optional(),
    output: z.string().trim().max(OUTPUT_MAX).nullable().optional(),
    status: workLogStatusSchema.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "Provide at least one field to update.",
  });

export type UpdateWorkLogInput = z.infer<typeof updateWorkLogSchema>;

export const listWorkLogsFilterSchema = z.object({
  userId: z.string().min(1).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  taskId: z.string().min(1).optional(),
});

export type ListWorkLogsFilter = z.infer<typeof listWorkLogsFilterSchema>;

export const myDaySchema = z.object({
  date: dateOnlySchema,
});

export type MyDayInput = z.infer<typeof myDaySchema>;

// Free-standing helper so action + tests share one rule for the 24h edit window.
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function isWithinEditWindow(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < TWENTY_FOUR_HOURS_MS;
}

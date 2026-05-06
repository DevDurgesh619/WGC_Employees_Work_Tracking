import { WorkLogStatus } from "@prisma/client";
import { z } from "zod";

const FREE_TEXT_MAX = 120;
const DESCRIPTION_MAX = 2000;
const OUTPUT_MAX = 2000;

export const startTimerSchema = z.object({
  taskId: z
    .string()
    .min(1)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type StartTimerInput = z.infer<typeof startTimerSchema>;

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// Stopping a timer turns into a real work log (no more "draft" placeholder).
// taskId XOR freeTextTask is enforced via superRefine — same rule as createWorkLog.
export const stopTimerSchema = z.object({
  entryId: z.string().min(1),
  workLog: z
    .object({
      taskId: z
        .string()
        .min(1)
        .optional()
        .or(z.literal("").transform(() => undefined)),
      freeTextTask: optionalString(FREE_TEXT_MAX),
      description: z
        .string()
        .trim()
        .min(1, { message: "Description is required." })
        .max(DESCRIPTION_MAX),
      minutes: z.coerce
        .number()
        .int({ message: "Minutes must be a whole number." })
        .min(1, { message: "Log at least 1 minute." })
        .max(24 * 60, { message: "A single log can't exceed 24 hours." }),
      output: optionalString(OUTPUT_MAX),
      status: z.nativeEnum(WorkLogStatus).default(WorkLogStatus.DONE),
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
    }),
});

export type StopTimerInput = z.infer<typeof stopTimerSchema>;

export const discardTimerSchema = z.object({
  entryId: z.string().min(1),
});

export type DiscardTimerInput = z.infer<typeof discardTimerSchema>;

// Round elapsed-ms to whole minutes, with a 1-minute floor so a "near-instant"
// stop still produces a meaningful entry. Tested in T4.5.
export function elapsedMinutes(startedAt: Date, endedAt: Date): number {
  const ms = endedAt.getTime() - startedAt.getTime();
  if (ms <= 0) return 1;
  const minutes = Math.round(ms / 60_000);
  return Math.max(1, minutes);
}

import { WorkLogStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  createWorkLogSchema,
  isWithinEditWindow,
  updateWorkLogSchema,
} from "@/lib/validations/work-log";

const baseValid = {
  date: "2026-05-05",
  description: "Worked on the login flow.",
  minutes: 90,
  status: WorkLogStatus.DONE,
};

describe("isWithinEditWindow", () => {
  it("allows edits within 24h", () => {
    const now = new Date("2026-05-05T12:00:00Z");
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    expect(isWithinEditWindow(oneHourAgo, now)).toBe(true);
  });

  it("rejects edits exactly 24h after creation (boundary is exclusive)", () => {
    const now = new Date("2026-05-05T12:00:00Z");
    const exactly24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    expect(isWithinEditWindow(exactly24h, now)).toBe(false);
  });

  it("rejects edits long after creation", () => {
    const now = new Date("2026-05-05T12:00:00Z");
    const week = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(isWithinEditWindow(week, now)).toBe(false);
  });
});

describe("createWorkLogSchema task XOR free-text", () => {
  it("rejects when neither taskId nor freeTextTask is set", () => {
    const result = createWorkLogSchema.safeParse(baseValid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["freeTextTask"]);
    }
  });

  it("accepts a taskId on its own", () => {
    const result = createWorkLogSchema.safeParse({ ...baseValid, taskId: "task_123" });
    expect(result.success).toBe(true);
  });

  it("accepts free-text on its own", () => {
    const result = createWorkLogSchema.safeParse({ ...baseValid, freeTextTask: "Inbox triage" });
    expect(result.success).toBe(true);
  });

  it("rejects when both are set", () => {
    const result = createWorkLogSchema.safeParse({
      ...baseValid,
      taskId: "task_123",
      freeTextTask: "Other thing",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/either a task or free text/i);
    }
  });

  it("requires at least 1 minute", () => {
    const result = createWorkLogSchema.safeParse({
      ...baseValid,
      taskId: "task_123",
      minutes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects > 24h logs", () => {
    const result = createWorkLogSchema.safeParse({
      ...baseValid,
      taskId: "task_123",
      minutes: 24 * 60 + 1,
    });
    expect(result.success).toBe(false);
  });

  it("normalises YYYY-MM-DD to UTC midnight", () => {
    const result = createWorkLogSchema.safeParse({ ...baseValid, taskId: "task_123" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date.toISOString()).toBe("2026-05-05T00:00:00.000Z");
    }
  });
});

describe("updateWorkLogSchema", () => {
  it("requires at least one field", () => {
    expect(updateWorkLogSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single-field patch", () => {
    expect(updateWorkLogSchema.safeParse({ minutes: 30 }).success).toBe(true);
  });

  it("accepts nulling out taskId (to switch to free-text in one go)", () => {
    expect(updateWorkLogSchema.safeParse({ taskId: null, freeTextTask: "Triage" }).success).toBe(
      true,
    );
  });
});

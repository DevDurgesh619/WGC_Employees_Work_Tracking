import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canEditTask, canDeleteTask, isFounder } from "@/lib/rbac";
import { canTransitionTaskStatus } from "@/lib/validations/task";

const founder = { id: "u_f", role: "FOUNDER" as const };
const employee = { id: "u_e", role: "EMPLOYEE" as const };
const otherEmployee = { id: "u_o", role: "EMPLOYEE" as const };

const taskAssignedToEmployee = { assigneeId: employee.id, createdById: founder.id };

describe("task status transitions", () => {
  it("allows the documented forward path", () => {
    expect(canTransitionTaskStatus(TaskStatus.NOT_STARTED, TaskStatus.IN_PROGRESS)).toBe(true);
    expect(canTransitionTaskStatus(TaskStatus.IN_PROGRESS, TaskStatus.DONE)).toBe(true);
  });

  it("allows re-opening a DONE task to IN_PROGRESS", () => {
    expect(canTransitionTaskStatus(TaskStatus.DONE, TaskStatus.IN_PROGRESS)).toBe(true);
  });

  it("rejects DONE → BLOCKED (re-open via IN_PROGRESS first)", () => {
    expect(canTransitionTaskStatus(TaskStatus.DONE, TaskStatus.BLOCKED)).toBe(false);
  });

  it("rejects CANCELLED → DONE without going back through NOT_STARTED", () => {
    expect(canTransitionTaskStatus(TaskStatus.CANCELLED, TaskStatus.DONE)).toBe(false);
  });

  it("treats no-op transitions (same status) as legal", () => {
    for (const status of Object.values(TaskStatus)) {
      expect(canTransitionTaskStatus(status, status)).toBe(true);
    }
  });

  it("permits BLOCKED → CANCELLED (give-up path)", () => {
    expect(canTransitionTaskStatus(TaskStatus.BLOCKED, TaskStatus.CANCELLED)).toBe(true);
  });
});

describe("task permission rules", () => {
  it("founder can edit any task", () => {
    expect(canEditTask(founder, taskAssignedToEmployee)).toBe(true);
  });

  it("assignee can edit their task", () => {
    expect(canEditTask(employee, taskAssignedToEmployee)).toBe(true);
  });

  it("creator can edit a task they created", () => {
    expect(canEditTask({ id: founder.id, role: "EMPLOYEE" as const }, taskAssignedToEmployee)).toBe(
      true,
    );
  });

  it("unrelated employee cannot edit", () => {
    expect(canEditTask(otherEmployee, taskAssignedToEmployee)).toBe(false);
  });

  it("only founders can delete tasks", () => {
    expect(canDeleteTask(founder)).toBe(true);
    expect(canDeleteTask(employee)).toBe(false);
  });

  it("isFounder is consistent with the role check", () => {
    expect(isFounder(founder)).toBe(true);
    expect(isFounder(employee)).toBe(false);
  });
});

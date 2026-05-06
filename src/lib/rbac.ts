import { Role, type User } from "@prisma/client";

export function isFounder(user: Pick<User, "role">): boolean {
  return user.role === Role.FOUNDER;
}

export function isEmployee(user: Pick<User, "role">): boolean {
  return user.role === Role.EMPLOYEE;
}

export function canEditTask(
  user: Pick<User, "id" | "role">,
  task: { assigneeId: string; createdById: string },
): boolean {
  return isFounder(user) || task.assigneeId === user.id || task.createdById === user.id;
}

export function canDeleteTask(user: Pick<User, "role">): boolean {
  return isFounder(user);
}

export function canEditWorkLog(
  user: Pick<User, "id" | "role">,
  log: { userId: string; createdAt: Date },
): boolean {
  if (log.userId !== user.id) return false;
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return log.createdAt.getTime() >= cutoff;
}

export function canDeleteWorkLog(user: Pick<User, "role">): boolean {
  return isFounder(user);
}

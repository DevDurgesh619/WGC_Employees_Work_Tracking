import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/lib/db";

// Append-only audit. Failures here must NEVER fail the surrounding mutation —
// audit gaps are recoverable, but blocking a real action because logging
// failed is not. Callers can pass a transaction client to land the audit
// row in the same transaction as the change; otherwise we use the global.
export type AuditEntityType = "task" | "worklog" | "timer" | "task_request";

export type AuditAction =
  | "task.create"
  | "task.update"
  | "task.status"
  | "task.delete"
  | "worklog.create"
  | "worklog.update"
  | "worklog.delete"
  | "timer.start"
  | "timer.stop"
  | "timer.discard"
  | "task_request.create"
  | "task_request.fulfill"
  | "task_request.decline";

export type WriteAuditInput = {
  actorId: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  diff?: Prisma.InputJsonValue;
};

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function writeAudit(
  input: WriteAuditInput,
  client: DbClient = prisma,
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        diff: input.diff,
      },
    });
  } catch (err) {
    // Don't take the action down with us. Console-only — not Sentry — because
    // a noisy capture loop is worse than a missing row.
    console.warn("[audit] failed to write", input.action, input.entityId, err);
  }
}

// Build a {field: {from, to}} diff for an update, dropping unchanged fields.
// Limits diffs to the fields the caller picked, so PII never sneaks in.
export function diffOf<T extends Record<string, unknown>>(before: T, after: T): Prisma.InputJsonValue {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (before[k] !== after[k]) {
      out[k] = { from: before[k] ?? null, to: after[k] ?? null };
    }
  }
  return out as Prisma.InputJsonValue;
}

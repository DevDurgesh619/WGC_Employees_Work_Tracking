import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { elapsedMinutes } from "@/lib/validations/time-entry";

describe("elapsedMinutes (timer rounding)", () => {
  it("returns 1 for a sub-minute session (round-up to floor)", () => {
    const start = new Date("2026-05-05T12:00:00Z");
    const stop = new Date("2026-05-05T12:00:10Z"); // 10 seconds
    expect(elapsedMinutes(start, stop)).toBe(1);
  });

  it("returns 1 for a near-zero session (clock-skew safe)", () => {
    const start = new Date("2026-05-05T12:00:00.000Z");
    const stop = new Date("2026-05-05T12:00:00.005Z");
    expect(elapsedMinutes(start, stop)).toBe(1);
  });

  it("returns 1 if stop precedes start (clock-skew safe)", () => {
    const start = new Date("2026-05-05T12:00:10Z");
    const stop = new Date("2026-05-05T12:00:00Z");
    expect(elapsedMinutes(start, stop)).toBe(1);
  });

  it("rounds 89s to 1 minute (banker-style nearest)", () => {
    const start = new Date("2026-05-05T12:00:00Z");
    const stop = new Date("2026-05-05T12:01:29Z");
    expect(elapsedMinutes(start, stop)).toBe(1);
  });

  it("rounds 91s to 2 minutes", () => {
    const start = new Date("2026-05-05T12:00:00Z");
    const stop = new Date("2026-05-05T12:01:31Z");
    expect(elapsedMinutes(start, stop)).toBe(2);
  });

  it("returns the exact whole number for round inputs", () => {
    const start = new Date("2026-05-05T12:00:00Z");
    const stop = new Date("2026-05-05T13:00:00Z");
    expect(elapsedMinutes(start, stop)).toBe(60);
  });

  it("handles long sessions (8h)", () => {
    const start = new Date("2026-05-05T09:00:00Z");
    const stop = new Date("2026-05-05T17:00:00Z");
    expect(elapsedMinutes(start, stop)).toBe(8 * 60);
  });
});

// ---- Single-active invariant: drive the action against a controllable Prisma mock.
const prismaMock = {
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  task: { findFirst: vi.fn() },
  timeEntry: { create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  workLog: { create: vi.fn() },
  $transaction: vi.fn(),
};

const supabaseMock = { auth: { getUser: vi.fn() } };
const redirectMock = vi.fn(() => {
  throw new Error("__redirect__");
});

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => supabaseMock }));
vi.mock("@/server/queries/time-entries", () => ({ getActiveTimerForUser: vi.fn() }));

const ACTIVE_USER = {
  id: "u_alice",
  supabaseUserId: "sb_alice",
  email: "alice@example.test",
  name: "Alice",
  role: "EMPLOYEE" as const,
  timezone: "Asia/Kolkata",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("startTimer single-active invariant", () => {
  beforeEach(() => {
    Object.values(prismaMock).forEach((m) => {
      if (typeof m === "function") return;
      Object.values(m).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset?.());
    });
    prismaMock.$transaction.mockReset();
    supabaseMock.auth.getUser.mockReset();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "sb_alice" } } });
    prismaMock.user.findUnique.mockResolvedValue(ACTIVE_USER);
  });

  afterEach(() => vi.resetModules());

  it("creates a TimeEntry on first start", async () => {
    prismaMock.timeEntry.create.mockResolvedValue({
      id: "te_1",
      userId: ACTIVE_USER.id,
      startedAt: new Date(),
    });
    const { startTimer } = await import("@/server/actions/time-entries");
    const result = await startTimer({});
    expect(result.ok).toBe(true);
    expect(prismaMock.timeEntry.create).toHaveBeenCalledOnce();
  });

  it("returns CONFLICT when the partial unique index fires (P2002)", async () => {
    const { Prisma } = await import("@prisma/client");
    const conflict = new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
      code: "P2002",
      clientVersion: "6.0.0",
    });
    prismaMock.timeEntry.create.mockRejectedValue(conflict);

    const { startTimer } = await import("@/server/actions/time-entries");
    const result = await startTimer({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("CONFLICT");
    }
  });

  it("re-throws unrelated Prisma errors", async () => {
    const { Prisma } = await import("@prisma/client");
    const other = new Prisma.PrismaClientKnownRequestError("Boom", {
      code: "P1001",
      clientVersion: "6.0.0",
    });
    prismaMock.timeEntry.create.mockRejectedValue(other);

    const { startTimer } = await import("@/server/actions/time-entries");
    await expect(startTimer({})).rejects.toThrow("Boom");
  });
});

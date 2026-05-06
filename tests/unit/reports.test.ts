import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = {
  user: { findMany: vi.fn() },
  workLog: { groupBy: vi.fn() },
  task: { groupBy: vi.fn() },
};

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

const ALICE = { id: "u_alice", name: "Alice", email: "alice@x.test" };
const BOB = { id: "u_bob", name: "Bob", email: "bob@x.test" };

describe("getTeamOverview range filter + stitching", () => {
  beforeEach(() => {
    Object.values(prismaMock).forEach((m) =>
      Object.values(m).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset()),
    );
  });

  afterEach(() => vi.resetModules());

  it("returns empty totals when there are no employees", async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    const { getTeamOverview } = await import("@/server/queries/reports");
    const out = await getTeamOverview({
      from: new Date("2026-05-01"),
      to: new Date("2026-05-07"),
    });
    expect(out.perUser).toEqual([]);
    expect(out.teamTotals).toEqual({
      totalMinutes: 0,
      totalEmployees: 0,
      activeEmployeesToday: 0,
    });
    // No follow-up queries should fire when there are no employees.
    expect(prismaMock.workLog.groupBy).not.toHaveBeenCalled();
    expect(prismaMock.task.groupBy).not.toHaveBeenCalled();
  });

  it("scopes the work_logs groupBy to the range and active employees", async () => {
    prismaMock.user.findMany.mockResolvedValue([ALICE, BOB]);
    prismaMock.workLog.groupBy.mockResolvedValue([
      { userId: "u_alice", date: new Date(Date.UTC(2026, 4, 5)), _sum: { minutes: 90 } },
      { userId: "u_alice", date: new Date(Date.UTC(2026, 4, 6)), _sum: { minutes: 30 } },
      { userId: "u_bob", date: new Date(Date.UTC(2026, 4, 5)), _sum: { minutes: 45 } },
    ]);
    prismaMock.task.groupBy.mockResolvedValue([]);

    const from = new Date("2026-05-01");
    const to = new Date("2026-05-07");

    const { getTeamOverview } = await import("@/server/queries/reports");
    const out = await getTeamOverview({ from, to, todayIso: "2026-05-06" });

    const dailyCall = prismaMock.workLog.groupBy.mock.calls[0]?.[0];
    expect(dailyCall.where).toMatchObject({
      userId: { in: ["u_alice", "u_bob"] },
      deletedAt: null,
      date: { gte: from, lte: to },
    });

    const alice = out.perUser.find((u) => u.user.id === "u_alice")!;
    expect(alice.totalMinutes).toBe(120);
    expect(alice.hasLoggedToday).toBe(true); // 2026-05-06 is in the daily rows

    const bob = out.perUser.find((u) => u.user.id === "u_bob")!;
    expect(bob.totalMinutes).toBe(45);
    expect(bob.hasLoggedToday).toBe(false);

    expect(out.teamTotals.totalMinutes).toBe(165);
    expect(out.teamTotals.activeEmployeesToday).toBe(1);
  });

  it("ignores zero-minute aggregate rows when computing hasLoggedToday", async () => {
    prismaMock.user.findMany.mockResolvedValue([ALICE]);
    prismaMock.workLog.groupBy.mockResolvedValue([
      { userId: "u_alice", date: new Date(Date.UTC(2026, 4, 6)), _sum: { minutes: 0 } },
    ]);
    prismaMock.task.groupBy.mockResolvedValue([]);

    const { getTeamOverview } = await import("@/server/queries/reports");
    const out = await getTeamOverview({
      from: new Date("2026-05-01"),
      to: new Date("2026-05-07"),
      todayIso: "2026-05-06",
    });

    expect(out.perUser[0]?.hasLoggedToday).toBe(false);
    expect(out.teamTotals.activeEmployeesToday).toBe(0);
  });

  it("counts in-progress tasks separately from open total", async () => {
    prismaMock.user.findMany.mockResolvedValue([ALICE]);
    prismaMock.workLog.groupBy.mockResolvedValue([]);
    prismaMock.task.groupBy
      .mockResolvedValueOnce([
        { assigneeId: "u_alice", status: "NOT_STARTED", _count: { _all: 2 } },
        { assigneeId: "u_alice", status: "IN_PROGRESS", _count: { _all: 1 } },
        { assigneeId: "u_alice", status: "BLOCKED", _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([{ assigneeId: "u_alice", _count: { _all: 3 } }]);

    const { getTeamOverview } = await import("@/server/queries/reports");
    const out = await getTeamOverview({
      from: new Date("2026-05-01"),
      to: new Date("2026-05-07"),
    });

    const alice = out.perUser[0]!;
    expect(alice.openTasks).toBe(4);
    expect(alice.inProgressTasks).toBe(1);
    expect(alice.completedTasksInRange).toBe(3);
  });
});

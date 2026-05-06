import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createTaskRequestSchema,
  declineTaskRequestSchema,
  fulfillTaskRequestSchema,
} from "@/lib/validations/task-request";

describe("task-request validation", () => {
  it("accepts an empty message (employee has nothing extra to say)", () => {
    expect(createTaskRequestSchema.parse({})).toEqual({});
    expect(createTaskRequestSchema.parse({ message: "" }).message).toBeUndefined();
  });

  it("trims and bounds message length", () => {
    const long = "x".repeat(501);
    expect(() => createTaskRequestSchema.parse({ message: long })).toThrow();
    expect(createTaskRequestSchema.parse({ message: "  pls  " }).message).toBe("pls");
  });

  it("requires a task input on fulfill", () => {
    expect(() => fulfillTaskRequestSchema.parse({})).toThrow();
    const ok = fulfillTaskRequestSchema.parse({
      task: { title: "Reach out to lead", priority: "MEDIUM" },
    });
    expect(ok.task.title).toBe("Reach out to lead");
    // assigneeId is forced server-side — schema must not require it.
    expect("assigneeId" in ok.task).toBe(false);
  });

  it("decline reason is optional and bounded", () => {
    expect(declineTaskRequestSchema.parse({})).toEqual({});
    expect(() => declineTaskRequestSchema.parse({ reason: "y".repeat(501) })).toThrow();
  });
});

// ---- Action invariants: drive against a controllable Prisma mock so we can
// pin down the "one open request per employee" rule and the fulfil/decline
// status guards without needing a database.

const prismaMock = {
  user: { findUnique: vi.fn(), findFirst: vi.fn() },
  taskRequest: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  task: { create: vi.fn() },
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

const EMPLOYEE = {
  id: "u_emp",
  supabaseUserId: "sb_emp",
  email: "alice@example.test",
  name: "Alice",
  role: "EMPLOYEE" as const,
  timezone: "Asia/Kolkata",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FOUNDER = { ...EMPLOYEE, id: "u_f", supabaseUserId: "sb_f", role: "FOUNDER" as const };

function resetMocks() {
  Object.values(prismaMock).forEach((m) => {
    if (typeof m === "function") return;
    Object.values(m).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset?.());
  });
  prismaMock.$transaction.mockReset();
  supabaseMock.auth.getUser.mockReset();
}

describe("createTaskRequest single-open invariant", () => {
  beforeEach(() => {
    resetMocks();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "sb_emp" } } });
    prismaMock.user.findUnique.mockResolvedValue(EMPLOYEE);
  });
  afterEach(() => vi.resetModules());

  it("creates a request when no OPEN one exists", async () => {
    prismaMock.taskRequest.findFirst.mockResolvedValue(null);
    prismaMock.taskRequest.create.mockResolvedValue({ id: "tr_1" });
    const { createTaskRequest } = await import("@/server/actions/task-requests");
    const res = await createTaskRequest({ message: "give me work" });
    expect(res.ok).toBe(true);
    expect(prismaMock.taskRequest.create).toHaveBeenCalledOnce();
  });

  it("rejects with CONFLICT when an OPEN request already exists", async () => {
    prismaMock.taskRequest.findFirst.mockResolvedValue({ id: "tr_existing" });
    const { createTaskRequest } = await import("@/server/actions/task-requests");
    const res = await createTaskRequest({});
    expect(res).toEqual({
      ok: false,
      error: "CONFLICT",
      message: expect.stringContaining("open"),
    });
    expect(prismaMock.taskRequest.create).not.toHaveBeenCalled();
  });
});

describe("fulfill / decline status guards", () => {
  beforeEach(() => {
    resetMocks();
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: { id: "sb_f" } } });
    prismaMock.user.findUnique.mockResolvedValue(FOUNDER);
  });
  afterEach(() => vi.resetModules());

  it("refuses to fulfill an already-resolved request", async () => {
    prismaMock.taskRequest.findUnique.mockResolvedValue({
      id: "tr_done",
      status: "FULFILLED",
      requesterId: "u_emp",
    });
    const { fulfillTaskRequest } = await import("@/server/actions/task-requests");
    const res = await fulfillTaskRequest("tr_done", {
      task: { title: "X", priority: "MEDIUM" },
    });
    expect(res).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("refuses to decline an already-resolved request", async () => {
    prismaMock.taskRequest.findUnique.mockResolvedValue({
      id: "tr_done",
      status: "DECLINED",
    });
    const { declineTaskRequest } = await import("@/server/actions/task-requests");
    const res = await declineTaskRequest("tr_done", { reason: "later" });
    expect(res).toMatchObject({ ok: false, error: "VALIDATION" });
    expect(prismaMock.taskRequest.update).not.toHaveBeenCalled();
  });
});

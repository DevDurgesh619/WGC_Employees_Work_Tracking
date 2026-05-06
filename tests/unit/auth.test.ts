import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mocks need to be set up before importing the module under test.

const supabaseGetUser = vi.fn();
const prismaUserFindUnique = vi.fn();
const redirect = vi.fn((path: string) => {
  // Mirror next/navigation's behaviour: redirect() throws.
  throw new Error(`__redirect__:${path}`);
});

vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: supabaseGetUser },
  }),
}));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: prismaUserFindUnique },
  },
}));

const ACTIVE_FOUNDER = {
  id: "u_founder",
  supabaseUserId: "sb_founder",
  email: "founder@example.test",
  name: "Founder One",
  role: "FOUNDER" as const,
  timezone: "Asia/Kolkata",
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ACTIVE_EMPLOYEE = { ...ACTIVE_FOUNDER, id: "u_emp", role: "EMPLOYEE" as const };
const INACTIVE_USER = { ...ACTIVE_EMPLOYEE, id: "u_inactive", isActive: false };

describe("auth helpers", () => {
  beforeEach(() => {
    supabaseGetUser.mockReset();
    prismaUserFindUnique.mockReset();
    redirect.mockClear();
  });

  afterEach(() => vi.resetModules());

  describe("getSession", () => {
    it("returns null when there is no Supabase session", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: null } });
      const { getSession } = await import("@/lib/auth");
      expect(await getSession()).toBeNull();
      expect(prismaUserFindUnique).not.toHaveBeenCalled();
    });

    it("returns null when the local user record is missing", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_unknown" } } });
      prismaUserFindUnique.mockResolvedValue(null);
      const { getSession } = await import("@/lib/auth");
      expect(await getSession()).toBeNull();
    });

    it("returns null for inactive users", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_inactive" } } });
      prismaUserFindUnique.mockResolvedValue(INACTIVE_USER);
      const { getSession } = await import("@/lib/auth");
      expect(await getSession()).toBeNull();
    });

    it("returns the user when active", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_founder" } } });
      prismaUserFindUnique.mockResolvedValue(ACTIVE_FOUNDER);
      const { getSession } = await import("@/lib/auth");
      expect(await getSession()).toEqual(ACTIVE_FOUNDER);
    });
  });

  describe("requireUser", () => {
    it("redirects to /login when there is no session", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: null } });
      const { requireUser } = await import("@/lib/auth");
      await expect(requireUser()).rejects.toThrow("__redirect__:/login");
      expect(redirect).toHaveBeenCalledWith("/login");
    });

    it("returns the user when authenticated", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_emp" } } });
      prismaUserFindUnique.mockResolvedValue(ACTIVE_EMPLOYEE);
      const { requireUser } = await import("@/lib/auth");
      expect(await requireUser()).toEqual(ACTIVE_EMPLOYEE);
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("requireFounder", () => {
    it("redirects to /login when there is no session", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: null } });
      const { requireFounder } = await import("@/lib/auth");
      await expect(requireFounder()).rejects.toThrow("__redirect__:/login");
    });

    it("redirects employees to /403", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_emp" } } });
      prismaUserFindUnique.mockResolvedValue(ACTIVE_EMPLOYEE);
      const { requireFounder } = await import("@/lib/auth");
      await expect(requireFounder()).rejects.toThrow("__redirect__:/403");
      expect(redirect).toHaveBeenCalledWith("/403");
    });

    it("returns the founder when role is FOUNDER", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_founder" } } });
      prismaUserFindUnique.mockResolvedValue(ACTIVE_FOUNDER);
      const { requireFounder } = await import("@/lib/auth");
      expect(await requireFounder()).toEqual(ACTIVE_FOUNDER);
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("requireEmployee", () => {
    it("redirects to /login when there is no session", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: null } });
      const { requireEmployee } = await import("@/lib/auth");
      await expect(requireEmployee()).rejects.toThrow("__redirect__:/login");
    });

    it("redirects founders to /admin/overview", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_founder" } } });
      prismaUserFindUnique.mockResolvedValue(ACTIVE_FOUNDER);
      const { requireEmployee } = await import("@/lib/auth");
      await expect(requireEmployee()).rejects.toThrow("__redirect__:/admin/overview");
      expect(redirect).toHaveBeenCalledWith("/admin/overview");
    });

    it("returns the employee when role is EMPLOYEE", async () => {
      supabaseGetUser.mockResolvedValue({ data: { user: { id: "sb_emp" } } });
      prismaUserFindUnique.mockResolvedValue(ACTIVE_EMPLOYEE);
      const { requireEmployee } = await import("@/lib/auth");
      expect(await requireEmployee()).toEqual(ACTIVE_EMPLOYEE);
      expect(redirect).not.toHaveBeenCalled();
    });
  });
});

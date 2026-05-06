import { describe, expect, it } from "vitest";

import { isFounder, isEmployee } from "@/lib/rbac";

describe("rbac smoke", () => {
  it("classifies founder vs employee", () => {
    expect(isFounder({ role: "FOUNDER" })).toBe(true);
    expect(isEmployee({ role: "EMPLOYEE" })).toBe(true);
    expect(isFounder({ role: "EMPLOYEE" })).toBe(false);
  });
});

import { expect, test } from "@playwright/test";

import { ALICE, FOUNDER, signIn, signOut } from "./helpers";

test.describe("founder team overview", () => {
  test("reflects an employee's new log", async ({ page }) => {
    // 1. Alice signs in and adds a free-text log so the overview totals tick up.
    await signIn(page, ALICE);
    await page.goto("/log");

    await page.getByRole("button", { name: /^add log$/i }).click();
    await page.getByLabel("Task").click();
    await page.getByRole("option", { name: /free text/i }).click();

    const marker = `e2e-overview-${Date.now()}`;
    await page.getByLabel(/what were you working on/i).fill(marker);
    await page.getByLabel("Description").fill(`Logged via overview e2e at ${new Date().toISOString()}`);
    await page.getByLabel("Minutes").fill("23");
    await page.getByRole("button", { name: /save log/i }).click();

    // Confirm the log landed.
    await expect(page.getByRole("button", { name: /save log/i })).toBeHidden();
    await expect(page.getByText(marker)).toBeVisible();

    await signOut(page);

    // 2. Founder signs in and reads the overview — Alice's row should show the
    //    "Logged" badge and a non-zero hours cell.
    await signIn(page, FOUNDER);
    await page.goto("/admin/overview");

    await expect(page.getByRole("heading", { name: /team overview/i })).toBeVisible();

    const aliceRow = page.getByRole("row").filter({ hasText: "Employee Alice" });
    await expect(aliceRow).toBeVisible();
    await expect(aliceRow.getByText(/logged/i)).toBeVisible();

    // 3. Drill in — confirms the marker shows up on the per-employee page too.
    await aliceRow.getByRole("link", { name: "Employee Alice" }).click();
    await page.waitForURL(/\/admin\/employees\/[a-z0-9]+/i);
    await expect(page.getByText(marker)).toBeVisible();
  });
});

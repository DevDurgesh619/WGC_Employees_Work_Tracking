import { expect, test } from "@playwright/test";

// Requires `pnpm db:seed` to have populated the seed accounts.
// See prisma/seed.ts for the canonical credentials.
const SEED_EMAIL = "employee.alice@example.test";
const SEED_PASSWORD = "DevPassword123!";

test.describe("login happy path", () => {
  test("signs in and lands on /dashboard with greeting", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByLabel("Email")).toBeVisible();

    await page.getByLabel("Email").fill(SEED_EMAIL);
    await page.getByLabel("Password").fill(SEED_PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: /hello, employee alice/i })).toBeVisible();
  });
});

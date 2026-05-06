import { expect, test } from "@playwright/test";

const ALICE = { email: "employee.alice@example.test", password: "DevPassword123!" };

async function signIn(page: import("@playwright/test").Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

test.describe("work log flow", () => {
  test("logging time bumps the day total + dashboard total", async ({ page }) => {
    await signIn(page, ALICE);

    // Read the dashboard's "today's logged time" before logging.
    const dashboardTotalLocator = page.locator("text=Today’s logged time").locator("..").locator("h3, h4, h2, h5, p, div").nth(1);
    void dashboardTotalLocator;
    // Use a more direct approach — capture the tile's number text.
    const beforeText = await page.getByText(/Today’s logged time/).locator("..").innerText();

    // Go to /log and add a free-text log so we don't depend on a specific task fixture.
    await page.goto("/log");

    const dayTotalCard = page.getByText(/Day total/i).locator("..");
    const beforeDayTotal = await dayTotalCard.innerText();

    await page.getByRole("button", { name: /^add log$/i }).click();

    // Pick "Free text (no task)" so we don't need a fresh assignee.
    await page.getByLabel("Task").click();
    await page.getByRole("option", { name: /free text/i }).click();

    const marker = `e2e-log-${Date.now()}`;
    await page.getByLabel(/what were you working on/i).fill(marker);
    await page.getByLabel("Description").fill(`Logged via e2e at ${new Date().toISOString()}`);
    await page.getByLabel("Minutes").fill("17");

    await page.getByRole("button", { name: /save log/i }).click();

    // Dialog closes on success.
    await expect(page.getByRole("button", { name: /save log/i })).toBeHidden();

    // The free-text marker now appears in the day's table.
    await expect(page.getByText(marker)).toBeVisible();

    // Day total card has updated.
    const afterDayTotal = await dayTotalCard.innerText();
    expect(afterDayTotal).not.toBe(beforeDayTotal);

    // Dashboard tile reflects the new total too.
    await page.goto("/dashboard");
    const afterText = await page.getByText(/Today’s logged time/).locator("..").innerText();
    expect(afterText).not.toBe(beforeText);
  });
});

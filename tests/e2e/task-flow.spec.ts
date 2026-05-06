import { expect, test } from "@playwright/test";

import { ALICE, FOUNDER, signIn, signOut } from "./helpers";

test.describe("task flow", () => {
  test("founder creates → employee sees + marks DONE → founder sees DONE", async ({ page }) => {
    // Unique title so the test is independent of any prior state.
    const title = `e2e-task-${Date.now()}`;

    // 1. Founder creates a task assigned to Alice.
    await signIn(page, FOUNDER);
    await page.goto("/admin/assign");
    await page.getByRole("button", { name: /new task/i }).click();
    await page.getByLabel("Title").fill(title);
    await page.getByRole("checkbox", { name: /Employee Alice/ }).check();
    await page.getByRole("button", { name: /create task/i }).click();

    // Dialog closes on success.
    await expect(page.getByRole("button", { name: /create task/i })).toBeHidden();

    await signOut(page);

    // 2. Alice sees the task and opens it.
    await signIn(page, ALICE);
    await page.goto("/tasks");
    const taskLink = page.getByRole("link", { name: title });
    await expect(taskLink).toBeVisible();
    await taskLink.click();

    // Capture the detail URL so the founder can re-visit it later.
    await page.waitForURL(/\/tasks\/[a-z0-9]+/i);
    const taskUrl = page.url();

    // 3. Alice marks it DONE via the StatusChanger.
    await page.getByTestId("status-changer-trigger").click();
    await page.getByRole("option", { name: "Done" }).click();

    // The trigger label updates to "Done".
    await expect(page.getByTestId("status-changer-trigger")).toHaveText(/done/i);

    await signOut(page);

    // 4. Founder visits the same URL and confirms DONE.
    await signIn(page, FOUNDER);
    await page.goto(taskUrl);
    await expect(page.getByText("Done").first()).toBeVisible();
  });
});

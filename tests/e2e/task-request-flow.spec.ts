import { expect, test } from "@playwright/test";

import { ALICE, FOUNDER, signIn, signOut } from "./helpers";

test.describe("task-request flow", () => {
  test("idle employee requests → founder fulfills → employee sees the new task", async ({
    page,
  }) => {
    // Unique title so the test doesn't collide with prior runs.
    const taskTitle = `e2e-request-${Date.now()}`;
    const askMessage = `Please give me ${taskTitle}.`;

    // 1. Alice opens "Request a task" from the dashboard.
    await signIn(page, ALICE);
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /request a task/i }).click();
    await page.getByLabel(/message/i).fill(askMessage);
    await page.getByRole("button", { name: /send request/i }).click();

    // The dialog closes and the request shows up in "Your task requests".
    await expect(page.getByRole("button", { name: /send request/i })).toBeHidden();
    await expect(page.getByText(askMessage)).toBeVisible();
    // The trigger button now reflects the pending state.
    await expect(page.getByRole("button", { name: /request pending/i })).toBeDisabled();

    await signOut(page);

    // 2. Founder visits /admin/requests and fulfills with a fresh task title.
    await signIn(page, FOUNDER);
    await page.goto("/admin/requests");

    await expect(page.getByRole("heading", { name: /task requests/i })).toBeVisible();

    // The row for Alice's open request — find it by the message we just sent.
    const aliceRow = page.getByRole("row").filter({ hasText: askMessage });
    await expect(aliceRow).toBeVisible();

    await aliceRow.getByRole("button", { name: /^fulfill$/i }).click();

    // The fulfil dialog pre-fills title from the message; replace it with our marker.
    const titleInput = page.getByLabel("Title");
    await titleInput.fill(taskTitle);
    await page.getByRole("button", { name: /create & assign/i }).click();

    // Dialog closes; the request moves out of the open queue.
    await expect(page.getByRole("button", { name: /create & assign/i })).toBeHidden();

    await signOut(page);

    // 3. Alice signs back in and sees the new task on /tasks plus the
    //    fulfilled link on her dashboard.
    await signIn(page, ALICE);

    await page.goto("/tasks");
    await expect(page.getByRole("link", { name: taskTitle })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText(/fulfilled/i).first()).toBeVisible();
    // The fulfilled task can show up twice (in MyRequestsCard and in "Up next");
    // either is fine — we just want at least one link to exist.
    await expect(page.getByRole("link", { name: new RegExp(taskTitle) }).first()).toBeVisible();
  });
});

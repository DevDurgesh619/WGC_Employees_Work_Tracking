import type { Page } from "@playwright/test";

export const FOUNDER = { email: "founder.one@example.test", password: "DevPassword123!" };
export const ALICE = { email: "employee.alice@example.test", password: "DevPassword123!" };

// After /login the app lands employees on /dashboard and founders on
// /admin/overview (the dashboard page server-redirects founders away).
// Wait for any post-login URL so the helper works for either role.
export async function signIn(page: Page, creds: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password").fill(creds.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => /\/(dashboard|admin\/overview)$/.test(url.pathname));
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/login");
}

import { expect, type Page } from "@playwright/test";

import { gotoApp } from "./navigation";

export const TEST_PASSWORD = "Password123!";

export const USERS = {
  admin: { email: "admin@privotage.test", password: TEST_PASSWORD },
  recruiter: { email: "recruiter@privotage.test", password: TEST_PASSWORD },
  manager: { email: "manager@privotage.test", password: TEST_PASSWORD },
} as const;

export async function loginAs(
  page: Page,
  email: string,
  password: string = TEST_PASSWORD,
): Promise<void> {
  await gotoApp(page, "/login");
  await expect(page.getByLabel("Email")).toBeVisible({ timeout: 60_000 });
  await page.waitForLoadState("networkidle").catch(() => undefined);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);

  const signIn = page.getByRole("button", { name: "Sign in" });
  await expect(signIn).toBeEnabled();

  await Promise.all([
    page.waitForURL(/\/dashboard/, { waitUntil: "domcontentloaded" }),
    signIn.click(),
  ]);

  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
}

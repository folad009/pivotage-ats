import { expect, test } from "@playwright/test";

import { loginAs, USERS } from "./helpers/auth";
import { gotoApp } from "./helpers/navigation";
import { getSeededApplicationDetailPath } from "./helpers/seed-fixtures";

test.describe("RBAC negative paths", () => {
  test("hiring manager cannot manage clients or create jobs", async ({ page }) => {
    await loginAs(page, USERS.manager.email, USERS.manager.password);

    await gotoApp(page, "/clients");
    await expect(page.getByText("No access")).toBeVisible();
    await expect(page.getByRole("button", { name: "New client" })).toHaveCount(
      0,
    );

    await gotoApp(page, "/jobs");
    await expect(
      page.getByRole("heading", { name: "Jobs", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "New job" })).toHaveCount(0);

    await gotoApp(page, "/settings");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("hiring manager cannot archive applications", async ({ page }) => {
    const detailPath = await getSeededApplicationDetailPath();
    await loginAs(page, USERS.manager.email, USERS.manager.password);
    await gotoApp(page, detailPath);

    await expect(
      page.getByRole("button", { name: "Archive application" }),
    ).toHaveCount(0);
  });
});

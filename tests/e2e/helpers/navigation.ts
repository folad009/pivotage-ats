import type { Page } from "@playwright/test";

/** Next.js dev server often never fires `load`; use domcontentloaded instead. */
export async function gotoApp(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
}

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Drags a kanban card into a pipeline column (dnd-kit). */
export async function dragCandidateToColumn(
  page: Page,
  candidateName: string,
  columnName: string,
): Promise<void> {
  const card = page.locator(".cursor-grab").filter({
    has: page.getByRole("link", { name: candidateName }),
  });
  await expect(card).toBeVisible();

  const column = page.getByLabel(`${columnName} column`, { exact: true });
  await expect(column).toBeVisible();

  const cardBox = await card.boundingBox();
  const columnBox = await column.boundingBox();
  if (!cardBox || !columnBox) {
    throw new Error(`Could not resolve drag targets for ${candidateName}`);
  }

  await page.mouse.move(
    cardBox.x + cardBox.width / 2,
    cardBox.y + cardBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    columnBox.x + columnBox.width / 2,
    columnBox.y + columnBox.height / 2,
    { steps: 12 },
  );
  await page.mouse.up();

  await page.waitForTimeout(750);
}

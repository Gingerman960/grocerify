import { test, expect, dragRow, SEED_ITEMS } from './fixtures';

test.describe('drag-drop reorder', () => {
  test('moving the first item below the second persists across reload', async ({ page }) => {
    await page.goto('/');
    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(SEED_ITEMS.length);

    const sorted = [...SEED_ITEMS].sort((a, b) => a.order - b.order);
    const originalFirst = sorted[0]!.name;
    const originalSecond = sorted[1]!.name;

    await dragRow(page, 0, 1);

    await expect(items.nth(0)).toContainText(originalSecond);
    await expect(items.nth(1)).toContainText(originalFirst);

    await page.reload();
    const reloaded = page.getByRole('listitem');
    await expect(reloaded.nth(0)).toContainText(originalSecond);
    await expect(reloaded.nth(1)).toContainText(originalFirst);
  });
});

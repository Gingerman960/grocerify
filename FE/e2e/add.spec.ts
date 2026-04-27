import { test, expect, SEED_ITEMS } from './fixtures';

test.describe('add item', () => {
  test('appends a new item and persists across reload', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Item name').fill('Avocados');
    await page.getByLabel('Amount').fill('3 pcs');
    await page.getByRole('button', { name: 'Add' }).click();

    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(SEED_ITEMS.length + 1);
    await expect(items.last()).toContainText('Avocados');
    await expect(items.last()).toContainText('3 pcs');

    await page.reload();
    await expect(page.getByRole('listitem')).toHaveCount(SEED_ITEMS.length + 1);
    await expect(page.getByRole('listitem').last()).toContainText('Avocados');
  });

  test('rejects empty name', async ({ page }) => {
    await page.goto('/');
    const addButton = page.getByRole('button', { name: 'Add' });
    await expect(addButton).toBeDisabled();
  });
});

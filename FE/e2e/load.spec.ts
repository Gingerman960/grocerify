import { test, expect, SEED_ITEMS } from './fixtures';

test.describe('initial load', () => {
  test('renders the seeded list with progress and ordering', async ({ page }) => {
    await page.goto('/');

    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(SEED_ITEMS.length);

    const sorted = [...SEED_ITEMS].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
      await expect(items.nth(i)).toContainText(sorted[i]!.name);
    }

    const bought = SEED_ITEMS.filter((it) => it.bought).length;
    await expect(page.getByText(`${bought} of ${SEED_ITEMS.length} bought`)).toBeVisible();
  });
});

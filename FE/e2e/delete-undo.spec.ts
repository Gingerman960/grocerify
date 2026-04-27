import { test, expect, deleteItem, SEED_ITEMS } from './fixtures';

const SHORT_UNDO_MS = 1500;
const TOAST_LIFETIME_MS = 5000;
const SAFETY_PAD_MS = 800;

test.describe('delete + undo', () => {
  test('undo before timeout restores the row at its original index', async ({ page }) => {
    await page.goto('/');
    const items = page.getByRole('listitem');
    const sorted = [...SEED_ITEMS].sort((a, b) => a.order - b.order);
    const target = sorted[2]!;

    const originalCount = await items.count();
    await deleteItem(page, target.name);
    await expect(items).toHaveCount(originalCount - 1);

    const toast = page.getByRole('status');
    await expect(toast).toContainText(target.name);

    await page.waitForTimeout(SHORT_UNDO_MS);
    await toast.getByRole('button', { name: 'Undo' }).click();

    await expect(items).toHaveCount(originalCount);
    await expect(items.nth(2)).toContainText(target.name);

    // No DELETE was sent — server still has it.
    const res = await fetch(`http://localhost:3001/items/${target.id}`);
    expect(res.status).toBe(200);
  });

  test('two concurrent deletes: undo one, let the other expire', async ({ page }) => {
    await page.goto('/');
    const sorted = [...SEED_ITEMS].sort((a, b) => a.order - b.order);
    const first = sorted[0]!;
    const second = sorted[1]!;

    await deleteItem(page, first.name);
    await page.waitForTimeout(400);
    await deleteItem(page, second.name);

    const toasts = page.getByRole('status');
    await expect(toasts).toHaveCount(2);

    // pendingDeletes is appended in deletion order, so toasts[0] corresponds
    // to `first`. Undo the older one — the one closest to expiring — so we
    // exercise the race between an undo and a still-pending DELETE.
    await toasts.first().getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText(first.name, { exact: false })).toBeVisible();
    await expect(toasts).toHaveCount(1);

    // Wait for the second toast's countdown to expire and the DELETE to fire.
    await page.waitForTimeout(TOAST_LIFETIME_MS + SAFETY_PAD_MS);
    await expect(toasts).toHaveCount(0);

    // First was undone — still on server.
    const firstRes = await fetch(`http://localhost:3001/items/${first.id}`);
    expect(firstRes.status).toBe(200);

    // Second expired — gone from server.
    const secondRes = await fetch(`http://localhost:3001/items/${second.id}`);
    expect(secondRes.status).toBe(404);

    // List shows first but not second.
    const items = page.getByRole('listitem');
    await expect(items).toHaveCount(SEED_ITEMS.length - 1);
  });
});

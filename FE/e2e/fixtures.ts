import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { test as base, expect, type Page } from '@playwright/test';

import { SEED_ITEMS } from './seed';

// Playwright runs with cwd = FE/ (where playwright.config.ts lives).
const DB_PATH = resolve(process.cwd(), '../BE/db/db.json');
const RELOAD_WAIT_MS = 250;

// We rewrite db.json directly instead of POST-ing through the API:
// json-server v0.17 (lowdb-backed) closes sockets under rapid sequential
// writes, which makes API-driven resets flaky. The --watch flag picks up
// the file change and reloads in-memory state.
async function resetDb(): Promise<void> {
  await writeFile(DB_PATH, JSON.stringify({ items: [...SEED_ITEMS] }, null, 2));
  await new Promise((r) => setTimeout(r, RELOAD_WAIT_MS));
}

// On desktop the row's action buttons (edit/delete) are pointer-events: none
// until the row is hovered. We surface them by hovering the row first.
async function deleteItem(page: Page, name: string): Promise<void> {
  const row = page.getByRole('listitem').filter({ hasText: name }).first();
  await row.hover();
  await page.getByRole('button', { name: `Delete ${name}` }).click();
}

async function dragRow(page: Page, fromIndex: number, toIndex: number): Promise<void> {
  const handles = page.getByLabel('Reorder item');
  const fromBox = await handles.nth(fromIndex).boundingBox();
  const toBox = await handles.nth(toIndex).boundingBox();
  if (!fromBox || !toBox) throw new Error('Drag handles not measurable');

  const startX = fromBox.x + fromBox.width / 2;
  const startY = fromBox.y + fromBox.height / 2;
  const endX = toBox.x + toBox.width / 2;
  const endY = toBox.y + toBox.height / 2 + (toIndex > fromIndex ? 20 : -20);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // CDK requires a small initial nudge before the drag is recognized.
  await page.mouse.move(startX, startY + 8, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 25 });
  await page.mouse.up();
}

export const test = base.extend({
  page: async ({ page }, run) => {
    await resetDb();
    await run(page);
  },
});

export { expect, dragRow, deleteItem, SEED_ITEMS };

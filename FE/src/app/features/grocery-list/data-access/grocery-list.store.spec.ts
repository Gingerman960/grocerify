import { of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { mockItem, mockItems } from '@testing/factories';

import { createStoreHarness } from './grocery-list.store-harness';

describe('GroceryListStore — loadAll', () => {
  it('populates entities and sets fulfilled status', () => {
    const { store } = createStoreHarness(mockItems(3));
    expect(store.entities()).toHaveLength(3);
    expect(store.isLoading()).toBe(false);
    expect(store.error()).toBeNull();
  });

  it('captures the error message when the API fails', () => {
    const { api, store } = createStoreHarness();
    api.getAll.mockReturnValue(throwError(() => new Error('boom')));
    store.loadAll();
    expect(store.error()).toBe('boom');
    expect(store.entities()).toHaveLength(0);
  });
});

describe('GroceryListStore — addItem (optimistic + rollback)', () => {
  it('inserts immediately with our generated id and includes name in the POST', () => {
    const { api, store } = createStoreHarness();
    api.create.mockReturnValue(of(mockItem({ name: 'Eggs', amount: '12 pcs' })));
    store.addItem({ name: 'Eggs', amount: '12 pcs' });
    expect(store.entities()).toHaveLength(1);
    expect(store.entities()[0]?.name).toBe('Eggs');
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Eggs', bought: false }),
    );
  });

  it('rolls back the optimistic insert when the API rejects', () => {
    const { api, store } = createStoreHarness();
    api.create.mockReturnValue(throwError(() => new Error('500')));
    store.addItem({ name: 'Eggs', amount: '12 pcs' });
    expect(store.entities()).toHaveLength(0);
    expect(store.error()).toBe('500');
  });

  it('assigns each new item a fractional order beyond the last existing one', () => {
    const seed = [mockItem({ id: 'a', order: 1000 }), mockItem({ id: 'b', order: 2000 })];
    const { api, store } = createStoreHarness(seed);
    api.create.mockReturnValue(of(mockItem({ name: 'New', order: 3000 })));
    store.addItem({ name: 'New', amount: '' });
    expect(store.sortedItems().at(-1)?.order).toBe(3000);
  });
});

describe('GroceryListStore — toggleBought (optimistic + rollback)', () => {
  it('flips immediately and persists', () => {
    const seed = [mockItem({ id: 'a', bought: false })];
    const { api, store } = createStoreHarness(seed);
    api.patch.mockReturnValue(of({ ...seed[0]!, bought: true }));
    store.toggleBought('a');
    expect(store.entityMap()['a']?.bought).toBe(true);
    expect(api.patch).toHaveBeenCalledWith('a', { bought: true });
  });

  it('reverts on API error and surfaces the message', () => {
    const seed = [mockItem({ id: 'a', bought: false })];
    const { api, store } = createStoreHarness(seed);
    api.patch.mockReturnValue(throwError(() => new Error('nope')));
    store.toggleBought('a');
    expect(store.entityMap()['a']?.bought).toBe(false);
    expect(store.error()).toBe('nope');
  });
});

describe('GroceryListStore — editItem (optimistic + rollback)', () => {
  it('applies changes and clears editingId', () => {
    const seed = [mockItem({ id: 'a', name: 'Old', amount: '1' })];
    const { api, store } = createStoreHarness(seed);
    store.startEdit('a');
    api.patch.mockReturnValue(of({ ...seed[0]!, name: 'New', amount: '2' }));
    store.editItem({ id: 'a', name: 'New', amount: '2' });
    expect(store.entityMap()['a']?.name).toBe('New');
    expect(store.editingId()).toBeNull();
  });

  it('reverts to the previous values on API error', () => {
    const seed = [mockItem({ id: 'a', name: 'Old', amount: '1' })];
    const { api, store } = createStoreHarness(seed);
    api.patch.mockReturnValue(throwError(() => new Error('bad')));
    store.editItem({ id: 'a', name: 'New', amount: '2' });
    expect(store.entityMap()['a']?.name).toBe('Old');
    expect(store.entityMap()['a']?.amount).toBe('1');
    expect(store.error()).toBe('bad');
  });
});

describe('GroceryListStore — reorder (optimistic + rollback via reload)', () => {
  it('issues a single PATCH at the post-removal destination index', () => {
    // CDK semantics: with 3 items moving previousIndex 0 → currentIndex 2 in
    // the destination list, the moved item lands at the end.
    // Removing 'a' leaves [b(2000), c(3000)]; inserting at index 2 means
    // last position → newOrder = 3000 + 1000 = 4000.
    const seed = [
      mockItem({ id: 'a', order: 1000 }),
      mockItem({ id: 'b', order: 2000 }),
      mockItem({ id: 'c', order: 3000 }),
    ];
    const { api, store } = createStoreHarness(seed);
    api.patch.mockReturnValue(of({ ...seed[0]!, order: 4000 }));
    store.reorder({ previousIndex: 0, currentIndex: 2 });
    expect(api.patch).toHaveBeenCalledTimes(1);
    expect(api.patch).toHaveBeenCalledWith('a', { order: 4000 });
    expect(store.entityMap()['a']?.order).toBe(4000);
  });

  it('produces a midpoint when the destination has neighbours on both sides', () => {
    // Larger seed: 4 items, move first to currentIndex 2.
    // Without 'a': [b(2000), c(3000), d(4000)]; insert at 2 → between c and d → 3500.
    const seed = [
      mockItem({ id: 'a', order: 1000 }),
      mockItem({ id: 'b', order: 2000 }),
      mockItem({ id: 'c', order: 3000 }),
      mockItem({ id: 'd', order: 4000 }),
    ];
    const { api, store } = createStoreHarness(seed);
    api.patch.mockReturnValue(of({ ...seed[0]!, order: 3500 }));
    store.reorder({ previousIndex: 0, currentIndex: 2 });
    expect(api.patch).toHaveBeenCalledWith('a', { order: 3500 });
  });

  it('reloads from the server when the reorder PATCH fails', () => {
    const { api, store } = createStoreHarness(mockItems(3));
    api.getAll.mockClear();
    api.patch.mockReturnValue(throwError(() => new Error('nope')));
    store.reorder({ previousIndex: 0, currentIndex: 2 });
    expect(store.error()).toBe('nope');
    expect(api.getAll).toHaveBeenCalledTimes(1);
  });
});

describe('GroceryListStore — progress computed', () => {
  it('reports 0/0 ratio 0 when empty', () => {
    const { store } = createStoreHarness();
    expect(store.progress()).toEqual({ total: 0, bought: 0, ratio: 0 });
  });

  it('counts bought items', () => {
    const { store } = createStoreHarness([
      mockItem({ id: 'a', bought: true }),
      mockItem({ id: 'b', bought: false, order: 2000 }),
      mockItem({ id: 'c', bought: true, order: 3000 }),
    ]);
    expect(store.progress()).toEqual({ total: 3, bought: 2, ratio: 2 / 3 });
  });
});

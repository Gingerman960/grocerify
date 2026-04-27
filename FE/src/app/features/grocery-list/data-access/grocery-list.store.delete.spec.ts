import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockItem } from '@testing/factories';

import { createStoreHarness } from './grocery-list.store-harness';

describe('GroceryListStore — delete with undo', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('removes the item immediately and pushes it onto the pendingDeletes stack (no DELETE yet)', () => {
    const { api, store } = createStoreHarness([mockItem({ id: 'a' }), mockItem({ id: 'b' })]);
    store.requestDelete('a');
    expect(store.entityMap()['a']).toBeUndefined();
    expect(store.pendingDeletes()).toHaveLength(1);
    expect(store.pendingDeletes()[0]?.id).toBe('a');
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('stacks multiple pending deletes — newest at the end, each independent', () => {
    const { api, store } = createStoreHarness([
      mockItem({ id: 'a' }),
      mockItem({ id: 'b' }),
      mockItem({ id: 'c' }),
    ]);
    store.requestDelete('a');
    store.requestDelete('c');
    expect(store.pendingDeletes().map((p) => p.id)).toEqual(['a', 'c']);
    expect(store.entityMap()['b']).toBeDefined();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('undo only the named item — leaves other pending deletes alone', () => {
    const { api, store } = createStoreHarness([mockItem({ id: 'a' }), mockItem({ id: 'b' })]);
    store.requestDelete('a');
    store.requestDelete('b');
    store.undoDelete('a');
    expect(store.entityMap()['a']).toBeDefined();
    expect(store.pendingDeletes().map((p) => p.id)).toEqual(['b']);
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('does NOT call DELETE when the user undoes within the window', () => {
    const { api, store } = createStoreHarness([mockItem({ id: 'a' })]);
    store.requestDelete('a');
    store.undoDelete('a');
    vi.advanceTimersByTime(10_000);
    expect(api.delete).not.toHaveBeenCalled();
    expect(store.entityMap()['a']).toBeDefined();
    expect(store.pendingDeletes()).toHaveLength(0);
  });

  it('fires DELETE after the undo window expires and clears the toast', () => {
    const { api, store } = createStoreHarness([mockItem({ id: 'a' })]);
    api.delete.mockReturnValue(of(undefined));
    store.requestDelete('a');
    vi.advanceTimersByTime(5_000);
    expect(api.delete).toHaveBeenCalledWith('a');
    expect(store.pendingDeletes()).toHaveLength(0);
  });

  it('restores the item when the eventual DELETE fails', () => {
    const { api, store } = createStoreHarness([mockItem({ id: 'a', name: 'Olive oil' })]);
    api.delete.mockReturnValue(throwError(() => new Error('server down')));
    store.requestDelete('a');
    vi.advanceTimersByTime(5_000);
    expect(store.entityMap()['a']?.name).toBe('Olive oil');
    expect(store.pendingDeletes()).toHaveLength(0);
    expect(store.error()).toBe('server down');
  });

  it('cancelAllPendingTimers stops every pending DELETE from firing', () => {
    const { api, store } = createStoreHarness([mockItem({ id: 'a' }), mockItem({ id: 'b' })]);
    store.requestDelete('a');
    store.requestDelete('b');
    store.cancelAllPendingTimers();
    vi.advanceTimersByTime(10_000);
    expect(api.delete).not.toHaveBeenCalled();
  });
});

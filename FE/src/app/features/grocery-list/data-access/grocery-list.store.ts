import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  addEntity,
  removeEntity,
  setAllEntities,
  updateEntity,
  withEntities,
} from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, exhaustMap, pipe, switchMap, tap } from 'rxjs';

import { GroceryListApi } from './grocery-list.api';
import { createDeleteOps } from './grocery-list.delete-helpers';
import { GroceryItem, GroceryItemDraft, GroceryItemPatch } from './grocery-list.types';
import { computeReorder, generateItemId, nextOrderAfter } from './grocery-list.utils';

type RequestStatus = 'idle' | 'loading' | 'fulfilled' | { readonly error: string };

type GroceryListState = {
  status: RequestStatus;
  pendingDeletes: readonly GroceryItem[];
  editingId: string | null;
};

const initialState: GroceryListState = { status: 'idle', pendingDeletes: [], editingId: null };

export const GroceryListStore = signalStore(
  withState(initialState),
  withEntities<GroceryItem>(),
  withComputed(({ entities, entityMap, ids, status }) => ({
    sortedItems: computed(() => {
      const map = entityMap();
      return [...ids()].sort((a, b) => map[a]!.order - map[b]!.order).map((id) => map[id]!);
    }),
    progress: computed(() => {
      const all = entities();
      let bought = 0;
      for (const i of all) if (i.bought) bought++;
      return { total: all.length, bought, ratio: all.length === 0 ? 0 : bought / all.length };
    }),
    isLoading: computed(() => status() === 'loading'),
    error: computed(() => {
      const s = status();
      return typeof s === 'object' ? s.error : null;
    }),
    isEmpty: computed(() => entities().length === 0),
  })),
  withMethods((store, api = inject(GroceryListApi)) => {
    const setError = (e: Error) => patchState(store, { status: { error: e.message } });
    const deleteOps = createDeleteOps(store, api, setError);

    const loadAll = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading' })),
        switchMap(() =>
          api.getAll().pipe(
            tapResponse({
              next: (items) =>
                patchState(store, setAllEntities(items), { status: 'fulfilled' as const }),
              error: setError,
            }),
          ),
        ),
      ),
    );

    const addItem = rxMethod<GroceryItemDraft>(
      pipe(
        exhaustMap((draft) => {
          const item: GroceryItem = {
            id: generateItemId(),
            name: draft.name.trim(),
            amount: draft.amount.trim(),
            bought: false,
            order: nextOrderAfter(store.sortedItems()),
          };
          patchState(store, addEntity(item));
          return api.create(item).pipe(
            tapResponse({
              next: () => undefined,
              error: (e: Error) => {
                patchState(store, removeEntity(item.id));
                setError(e);
              },
            }),
          );
        }),
      ),
    );

    const toggleBought = rxMethod<string>(
      pipe(
        exhaustMap((id) => {
          const current = store.entityMap()[id];
          if (!current) return EMPTY;
          const next = !current.bought;
          patchState(store, updateEntity({ id, changes: { bought: next } }));
          return api.patch(id, { bought: next }).pipe(
            tapResponse({
              next: () => undefined,
              error: (e: Error) => {
                patchState(store, updateEntity({ id, changes: { bought: current.bought } }));
                setError(e);
              },
            }),
          );
        }),
      ),
    );

    const editItem = rxMethod<{ readonly id: string } & GroceryItemPatch>(
      pipe(
        exhaustMap(({ id, ...changes }) => {
          const current = store.entityMap()[id];
          if (!current) return EMPTY;
          patchState(store, updateEntity({ id, changes }), { editingId: null });
          return api.patch(id, changes).pipe(
            tapResponse({
              next: () => undefined,
              error: (e: Error) => {
                patchState(store, updateEntity({ id, changes: current }));
                setError(e);
              },
            }),
          );
        }),
      ),
    );

    const reorder = rxMethod<{ readonly previousIndex: number; readonly currentIndex: number }>(
      pipe(
        exhaustMap(({ previousIndex, currentIndex }) => {
          const move = computeReorder(store.sortedItems(), previousIndex, currentIndex);
          if (!move) return EMPTY;
          patchState(store, updateEntity({ id: move.id, changes: { order: move.newOrder } }));
          return api.patch(move.id, { order: move.newOrder }).pipe(
            tapResponse({
              next: () => undefined,
              error: (e: Error) => {
                loadAll();
                setError(e);
              },
            }),
          );
        }),
      ),
    );

    return {
      loadAll,
      addItem,
      toggleBought,
      editItem,
      reorder,
      ...deleteOps,
      startEdit: (id: string) => patchState(store, { editingId: id }),
      cancelEdit: () => patchState(store, { editingId: null }),
    };
  }),
  withHooks({
    onInit: (store) => store.loadAll(),
    onDestroy: (store) => store.cancelAllPendingTimers(),
  }),
);

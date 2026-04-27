---
name: signal-store
description: NgRx SignalStore patterns for this project. Load this skill when creating, modifying, or reviewing any file matching `*.store.ts`, when the user asks to "build a store" / "add state" / "manage state for X", or when working with `@ngrx/signals` APIs (`signalStore`, `withState`, `withMethods`, `withComputed`, `withHooks`, `withEntities`, `rxMethod`, `patchState`, `signalStoreFeature`).
---

# NgRx SignalStore patterns

## Canonical store template

```ts
import { computed, inject } from '@angular/core';
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
import { tapResponse } from '@ngrx/operators';
import { exhaustMap, pipe, switchMap, tap } from 'rxjs';

import { GroceryListApi } from './grocery-list.api';
import { GroceryItem, GroceryItemDraft } from './grocery-list.types';
import { nextOrderAfter, orderBetween } from './grocery-list.utils';

type RequestStatus = 'idle' | 'loading' | 'fulfilled' | { error: string };

type GroceryListState = {
  status: RequestStatus;
};

const initialState: GroceryListState = {
  status: 'idle',
};

export const GroceryListStore = signalStore(
  // No providedIn: 'root' — provide at the route level
  withState(initialState),
  withEntities<GroceryItem>(),
  withComputed(({ entities, status }) => ({
    sortedItems: computed(() =>
      [...entities()].sort((a, b) => a.order - b.order),
    ),
    progress: computed(() => {
      const all = entities();
      const total = all.length;
      const bought = all.filter(i => i.bought).length;
      return { total, bought, ratio: total === 0 ? 0 : bought / total };
    }),
    isLoading: computed(() => status() === 'loading'),
    error: computed(() => {
      const s = status();
      return typeof s === 'object' ? s.error : null;
    }),
  })),
  withMethods((store, api = inject(GroceryListApi)) => ({
    loadAll: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { status: 'loading' })),
        switchMap(() =>
          api.getAll().pipe(
            tapResponse({
              next: items =>
                patchState(
                  store,
                  setAllEntities(items),
                  { status: 'fulfilled' },
                ),
              error: (e: Error) =>
                patchState(store, { status: { error: e.message } }),
            }),
          ),
        ),
      ),
    ),

    addItem: rxMethod<GroceryItemDraft>(
      pipe(
        // Optimistic insert with a temporary id
        tap(draft => {
          const tempId = `tmp_${crypto.randomUUID()}`;
          const order = nextOrderAfter(store.sortedItems());
          patchState(
            store,
            addEntity({
              id: tempId,
              name: draft.name,
              amount: draft.amount,
              bought: false,
              order,
              _pending: true,
            }),
          );
        }),
        exhaustMap(draft =>
          api.create(draft).pipe(
            tapResponse({
              next: serverItem => {
                // Replace temp with server-confirmed entity
                patchState(
                  store,
                  removeEntity(prevTempIdFor(store, serverItem)),
                  addEntity(serverItem),
                );
              },
              error: (e: Error) => {
                // Rollback the optimistic insert
                patchState(store, removeEntity(latestTempId(store)));
                patchState(store, { status: { error: e.message } });
              },
            }),
          ),
        ),
      ),
    ),

    toggleBought: rxMethod<string>(
      pipe(
        // Optimistic flip
        tap(id => {
          const item = store.entityMap()[id];
          if (!item) return;
          patchState(store, updateEntity({ id, changes: { bought: !item.bought } }));
        }),
        exhaustMap(id =>
          api.patch(id, { bought: store.entityMap()[id]?.bought }).pipe(
            tapResponse({
              next: () => {},
              error: (e: Error) => {
                // Rollback
                const item = store.entityMap()[id];
                if (item) {
                  patchState(store, updateEntity({ id, changes: { bought: !item.bought } }));
                }
                patchState(store, { status: { error: e.message } });
              },
            }),
          ),
        ),
      ),
    ),

    // editItem, deleteItem, reorder...
  })),
  withHooks({
    onInit(store) {
      store.loadAll();
    },
  }),
);
```

## Rules

- **One feature, one store.** No mega-stores. Split via `signalStoreFeature` mixins if a feature genuinely has multiple concerns.
- **No `providedIn: 'root'` for feature stores.** Provide at the route level so they're disposed when the feature unmounts:
  ```ts
  {
    path: 'list',
    providers: [GroceryListStore],
    loadComponent: () => import('./feature/grocery-list.page').then(m => m.GroceryListPage),
  }
  ```
- **`rxMethod` for everything async.** Never raw `subscribe` inside a store.
- **Always `tapResponse`** from `@ngrx/operators` — guarantees errors don't kill the inner stream.
- **`exhaustMap` for create/update/delete**, `switchMap` for "load latest". Never `mergeMap` on user-triggered writes (race conditions).
- **Optimistic updates**: mutate state, fire HTTP, rollback on error. This is the headline pattern — implement it cleanly with rollback paths visible.
- **`withHooks.onInit`** for initial load. Never `loadAll()` from the component's `ngOnInit`.
- **Custom features** (`signalStoreFeature`) for cross-cutting concerns like `withRequestStatus` or `withLogger`. Put them in `shared/util/store-features/`.
- **Expose readonly via the store's auto-generated signals** — `entities`, `entityMap`, computed signals, plus the state slices. Don't expose raw writable signals.

## What goes where

- `withState` — the minimal state shape. Don't put computed values here.
- `withEntities<T>()` — for any collection. Gives `entities`, `entityMap`, `ids` for free.
- `withComputed` — derived values. These memoize.
- `withMethods` — both sync (use `patchState`) and async (use `rxMethod`).
- `withHooks` — `onInit` for initial side effects, `onDestroy` for cleanup.

## Anti-patterns

- ❌ `effect()` inside a store to trigger state changes — use a method
- ❌ Calling `patchState` outside of methods — never from a component
- ❌ Storing computed/derived values in state — they go in `withComputed`
- ❌ Subscribing to `store.someSignal$` (it's not an observable) — read with `()`
- ❌ Putting business logic in components and using the store as a dumb bag — invert it

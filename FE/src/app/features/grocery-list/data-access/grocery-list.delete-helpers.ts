import { tapResponse } from '@ngrx/operators';
import { patchState, type WritableStateSource } from '@ngrx/signals';
import { addEntity, type EntityState, removeEntity } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { mergeMap, pipe } from 'rxjs';

import { GroceryListApi } from './grocery-list.api';
import { GroceryItem } from './grocery-list.types';

const UNDO_WINDOW_MS = 5000;

type DeleteState = { pendingDeletes: readonly GroceryItem[] };

// We need both the entity slice (so addEntity / removeEntity type-check) and
// the local pendingDeletes slice (so the patchState object form type-checks).
type StoreSlice = {
  readonly entityMap: () => Record<string, GroceryItem>;
  readonly pendingDeletes: () => readonly GroceryItem[];
} & WritableStateSource<DeleteState & EntityState<GroceryItem>>;

/**
 * Builds the delete-with-undo machinery for the grocery store.
 *
 * Trade-offs encoded here:
 * - Timer handles + in-flight item snapshots live in closure-scoped Maps,
 *   never in serialisable state (DevTools / SSR transfer-state stay clean).
 * - On undo-window expiry, the item moves out of `pendingDeletes` and into
 *   `inFlightDeletes` *before* the DELETE is sent — the toast disappears
 *   immediately, so undo can no longer race the network call.
 * - The DELETE itself runs through an `rxMethod`, so errors propagate and
 *   the subscription is bound to the store's lifecycle.
 */
export function createDeleteOps(
  store: StoreSlice,
  api: GroceryListApi,
  setError: (e: Error) => void,
) {
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();
  const inFlightDeletes = new Map<string, GroceryItem>();

  const confirmDelete = rxMethod<string>(
    pipe(
      mergeMap((id) =>
        api.delete(id).pipe(
          tapResponse({
            next: () => inFlightDeletes.delete(id),
            error: (e: Error) => {
              const restored = inFlightDeletes.get(id);
              inFlightDeletes.delete(id);
              if (restored) patchState(store, addEntity(restored));
              setError(e);
            },
          }),
        ),
      ),
    ),
  );

  return {
    requestDelete(id: string): void {
      const item = store.entityMap()[id];
      if (!item) return;
      patchState(store, removeEntity(id), {
        pendingDeletes: [...store.pendingDeletes(), item],
      });
      pendingTimers.set(
        id,
        setTimeout(() => {
          pendingTimers.delete(id);
          const pending = store.pendingDeletes().find((p) => p.id === id);
          if (!pending) return;
          inFlightDeletes.set(id, pending);
          patchState(store, {
            pendingDeletes: store.pendingDeletes().filter((p) => p.id !== id),
          });
          confirmDelete(id);
        }, UNDO_WINDOW_MS),
      );
    },
    undoDelete(id: string): void {
      const item = store.pendingDeletes().find((p) => p.id === id);
      if (!item) return;
      const timer = pendingTimers.get(id);
      if (timer) clearTimeout(timer);
      pendingTimers.delete(id);
      patchState(store, addEntity(item), {
        pendingDeletes: store.pendingDeletes().filter((p) => p.id !== id),
      });
    },
    cancelAllPendingTimers(): void {
      pendingTimers.forEach(clearTimeout);
      pendingTimers.clear();
    },
  };
}

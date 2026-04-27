---
name: drag-drop-reorder
description: Drag-and-drop reordering with Angular CDK in this project. Load this skill when implementing reorder functionality, working with `cdkDropList` / `cdkDrag` / `cdkDragHandle`, when the user mentions "drag to reorder" / "reorder items" / "sortable list", or when implementing the `reorder` method in a store.
---

# Drag-and-drop reordering

This project uses CDK drag-and-drop with **fractional ordering** — the production-grade pattern that requires only one PATCH per drag instead of re-numbering every affected item.

## Why fractional ordering

Naive reordering: re-number every item from 0..N-1 on every drag, send N PATCH requests. Quadratic behavior, chatty network, terrible.

Fractional: each item has a `number` order. New order is the midpoint between the neighbors at the drop position. One PATCH, no re-numbering of other items.

```
Items:        A(1000)   B(2000)   C(3000)   D(4000)
Move D between A and B:
              A(1000)   D(1500)   B(2000)   C(3000)   ← single patch on D
```

## The utilities

```ts
// data-access/grocery-list.utils.ts

const ORDER_GAP = 1000;

export function nextOrderAfter(
  sortedItems: ReadonlyArray<{ readonly order: number }>,
): number {
  if (sortedItems.length === 0) return ORDER_GAP;
  const last = sortedItems[sortedItems.length - 1]!.order;
  return last + ORDER_GAP;
}

export function orderBetween(
  prev: number | null,
  next: number | null,
): number {
  if (prev === null && next === null) return ORDER_GAP;
  if (prev === null) return next! - ORDER_GAP;
  if (next === null) return prev + ORDER_GAP;
  return (prev + next) / 2;
}

/**
 * Compute the new fractional order for an item being moved
 * from `previousIndex` to `currentIndex` in a sorted list.
 * Returns the new order, or `null` if no movement is needed.
 */
export function computeReorder(
  sortedItems: ReadonlyArray<{ readonly id: string; readonly order: number }>,
  previousIndex: number,
  currentIndex: number,
): { readonly id: string; readonly newOrder: number } | null {
  if (previousIndex === currentIndex) return null;
  const moved = sortedItems[previousIndex];
  if (!moved) return null;

  // Build the array as it will look AFTER the move, excluding the moved item
  const without = sortedItems.filter((_, i) => i !== previousIndex);
  const prev = currentIndex > 0 ? without[currentIndex - 1] ?? null : null;
  const next = without[currentIndex] ?? null;

  return {
    id: moved.id,
    newOrder: orderBetween(prev?.order ?? null, next?.order ?? null),
  };
}
```

## Float-precision caveat

After ~50 reorders between the same two items the midpoint can run out of precision. Real apps use string-based fractional indexing (lexicographic keys like `a0`, `a0V`, etc.) for unbounded depth. For a grocery list POC, plain `number` is fine — but if asked, mention this is the production upgrade path.

## Store method

```ts
reorder: rxMethod<{ previousIndex: number; currentIndex: number }>(
  pipe(
    // Compute optimistic update
    tap(({ previousIndex, currentIndex }) => {
      const sorted = store.sortedItems();
      const move = computeReorder(sorted, previousIndex, currentIndex);
      if (!move) return;
      patchState(store, updateEntity({ id: move.id, changes: { order: move.newOrder } }));
    }),
    exhaustMap(({ previousIndex, currentIndex }) => {
      const sorted = store.sortedItems();
      const move = computeReorder(sorted, previousIndex, currentIndex);
      if (!move) return EMPTY;
      return api.patch(move.id, { order: move.newOrder }).pipe(
        tapResponse({
          next: () => {},
          error: (e: Error) => {
            // Reload the canonical order from server on failure
            store.loadAll();
            patchState(store, { status: { error: e.message } });
          },
        }),
      );
    }),
  ),
),
```

## Template

```html
<ul
  cdkDropList
  (cdkDropListDropped)="onDrop($event)"
  class="list"
>
  @for (item of store.sortedItems(); track item.id) {
    <li cdkDrag class="row">
      <button cdkDragHandle class="handle" aria-label="Reorder">⋮⋮</button>
      <!-- rest of row -->
    </li>
  }
</ul>
```

## Component handler

```ts
protected onDrop(event: CdkDragDrop<unknown>): void {
  this.store.reorder({
    previousIndex: event.previousIndex,
    currentIndex: event.currentIndex,
  });
}
```

## Hard rules

- **Always use `cdkDragHandle`.** Whole-row drag is hostile UX on mobile and causes accidental drags during scroll.
- **Optimistic update + rollback via `loadAll`** — server reorder failure is rare; reloading is the cleanest correctness recovery.
- **Don't combine drag-and-drop with `cdkVirtualFor`.** CDK has known unsupported interaction (issue #22406). For a list with realistic size (≤200 items), don't reach for virtual scroll. If the list grows beyond 200, the conditional template described in the README disables reorder when virtual scroll activates.
- **Sort by `order` in `withComputed`** (`sortedItems`), not in the template. Templates render, they don't compute.
- **Don't use `track $index`** — always `track item.id` for entity lists. Index tracking on a reorderable list re-renders everything on every drag.

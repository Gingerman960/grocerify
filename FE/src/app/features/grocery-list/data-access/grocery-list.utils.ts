/**
 * Fractional ordering helpers — see drag-drop-reorder skill.
 * Each item carries a numeric `order`. Reordering computes the midpoint
 * between neighbours instead of renumbering every row, so a single PATCH
 * persists a drag.
 *
 * Production caveat: after ~50 swaps between the same two items the
 * midpoint runs out of float precision. The README documents the
 * lexicographic-string upgrade path.
 */

const ORDER_GAP = 1000;

type OrderedRef = { readonly order: number };
type OrderedItemRef = { readonly id: string; readonly order: number };

export function nextOrderAfter(sortedItems: readonly OrderedRef[]): number {
  if (sortedItems.length === 0) {
    return ORDER_GAP;
  }
  const last = sortedItems[sortedItems.length - 1];
  return (last?.order ?? 0) + ORDER_GAP;
}

export function orderBetween(prev: number | null, next: number | null): number {
  if (prev === null && next === null) {
    return ORDER_GAP;
  }
  if (prev === null) {
    return (next ?? ORDER_GAP) - ORDER_GAP;
  }
  if (next === null) {
    return prev + ORDER_GAP;
  }
  return (prev + next) / 2;
}

/**
 * Compute the new fractional order for an item being moved from
 * `previousIndex` to `currentIndex` in a sorted list.
 * Returns the new order, or `null` if no movement is needed.
 */
export function computeReorder(
  sortedItems: readonly OrderedItemRef[],
  previousIndex: number,
  currentIndex: number,
): { readonly id: string; readonly newOrder: number } | null {
  if (previousIndex === currentIndex) {
    return null;
  }
  const moved = sortedItems[previousIndex];
  if (!moved) {
    return null;
  }

  const without = sortedItems.filter((_, i) => i !== previousIndex);
  const prev = currentIndex > 0 ? (without[currentIndex - 1] ?? null) : null;
  const next = without[currentIndex] ?? null;

  return {
    id: moved.id,
    newOrder: orderBetween(prev?.order ?? null, next?.order ?? null),
  };
}

export function generateItemId(): string {
  return crypto.randomUUID();
}

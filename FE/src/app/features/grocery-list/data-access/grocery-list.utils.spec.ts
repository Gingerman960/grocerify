import { describe, expect, it } from 'vitest';

import { computeReorder, generateItemId, nextOrderAfter, orderBetween } from './grocery-list.utils';

describe('orderBetween', () => {
  it('returns the midpoint of two values', () => {
    expect(orderBetween(1000, 2000)).toBe(1500);
  });

  it('returns prev + GAP when next is null', () => {
    expect(orderBetween(1000, null)).toBe(2000);
  });

  it('returns next - GAP when prev is null', () => {
    expect(orderBetween(null, 2000)).toBe(1000);
  });

  it('returns the initial GAP when both ends are null', () => {
    expect(orderBetween(null, null)).toBe(1000);
  });

  it('handles consecutive midpoints without losing the ordering invariant', () => {
    // 1000 ──┐
    //       1500
    // 2000 ──┘
    const mid = orderBetween(1000, 2000);
    const left = orderBetween(1000, mid);
    const right = orderBetween(mid, 2000);
    expect(left).toBeLessThan(mid);
    expect(right).toBeGreaterThan(mid);
  });
});

describe('nextOrderAfter', () => {
  it('returns the GAP for an empty list', () => {
    expect(nextOrderAfter([])).toBe(1000);
  });

  it('returns the last order plus the GAP', () => {
    expect(nextOrderAfter([{ order: 1000 }, { order: 2500 }])).toBe(3500);
  });
});

describe('computeReorder', () => {
  const items = [
    { id: 'a', order: 1000 },
    { id: 'b', order: 2000 },
    { id: 'c', order: 3000 },
    { id: 'd', order: 4000 },
  ];

  it('returns null when previousIndex equals currentIndex (no-op drop)', () => {
    expect(computeReorder(items, 1, 1)).toBeNull();
  });

  it('returns null when previousIndex is out of bounds', () => {
    expect(computeReorder(items, 99, 0)).toBeNull();
  });

  it('moves an item to the end of the list', () => {
    expect(computeReorder(items, 0, 3)).toEqual({ id: 'a', newOrder: 5000 });
  });

  it('moves an item to the start of the list', () => {
    expect(computeReorder(items, 3, 0)).toEqual({ id: 'd', newOrder: 0 });
  });

  it('moves an item to a middle position via the CDK two-step (remove-then-insert) semantics', () => {
    // CDK's currentIndex is the destination *after* the moved item is removed.
    // Removing 'a' leaves [b(2000), c(3000), d(4000)]; inserting at index 2
    // places 'a' between c(3000) and d(4000) → midpoint 3500.
    expect(computeReorder(items, 0, 2)).toEqual({ id: 'a', newOrder: 3500 });
  });

  it('moves the only item in a one-element list to the same index → null', () => {
    expect(computeReorder([{ id: 'solo', order: 1000 }], 0, 0)).toBeNull();
  });
});

describe('generateItemId', () => {
  it('returns a 36-character RFC-4122 UUID string', () => {
    const id = generateItemId();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('returns a different value on each call', () => {
    expect(generateItemId()).not.toBe(generateItemId());
  });
});

---
name: testing-patterns
description: Testing patterns for this project — Vitest, SignalStore tests, component tests with TestBed, mocking the API layer. Load this skill when writing or modifying any `*.spec.ts` file, when the user asks to "add tests" / "test this" / "cover X with tests", or when configuring Vitest.
---

# Testing patterns

Vitest is the runner (Angular 21 default). Tests live next to the file they test: `grocery-list.store.spec.ts` next to `grocery-list.store.ts`.

## What to test where

| Layer | Coverage target | What to test |
|---|---|---|
| `data-access/<feature>.utils.ts` | 100% | Every branch of pure functions |
| `data-access/<feature>.store.ts` | ≥90% | State transitions, optimistic update + rollback, error paths |
| `ui/<component>` | ≥70% | Rendering of states (empty, loading, populated), output emissions |
| `feature/<page>` | smoke only | Routes resolve, store provides correctly |

## Store tests — the headline

Test the store directly. Mock the API at the boundary. Don't render components — that's a different test.

```ts
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError } from 'rxjs';

import { GroceryListStore } from './grocery-list.store';
import { GroceryListApi } from './grocery-list.api';
import { GroceryItem } from './grocery-list.types';

const mockItem = (overrides: Partial<GroceryItem> = {}): GroceryItem => ({
  id: 'item-1',
  name: 'Milk',
  amount: '2 L',
  bought: false,
  order: 1000,
  ...overrides,
});

describe('GroceryListStore', () => {
  let api: { getAll: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; patch: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let store: InstanceType<typeof GroceryListStore>;

  beforeEach(() => {
    api = {
      getAll: vi.fn().mockReturnValue(of([])),
      create: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        GroceryListStore,
        { provide: GroceryListApi, useValue: api },
      ],
    });

    store = TestBed.inject(GroceryListStore);
  });

  describe('loadAll', () => {
    it('populates entities and sets fulfilled status', () => {
      const items = [mockItem({ id: 'a' }), mockItem({ id: 'b', order: 2000 })];
      api.getAll.mockReturnValue(of(items));

      store.loadAll();

      expect(store.entities()).toHaveLength(2);
      expect(store.isLoading()).toBe(false);
      expect(store.error()).toBeNull();
    });

    it('captures error in status on failure', () => {
      api.getAll.mockReturnValue(throwError(() => new Error('boom')));

      store.loadAll();

      expect(store.error()).toBe('boom');
      expect(store.entities()).toHaveLength(0);
    });
  });

  describe('addItem (optimistic)', () => {
    it('inserts immediately with a temp id, then replaces with server item', () => {
      const serverItem = mockItem({ id: 'server-1', name: 'Eggs' });
      api.create.mockReturnValue(of(serverItem));

      store.addItem({ name: 'Eggs', amount: '12' });

      // After the synchronous tap, before the server responds, we have the temp item.
      // After the observable completes, we have the server-confirmed one.
      expect(store.entities()).toHaveLength(1);
      expect(store.entities()[0]?.id).toBe('server-1');
    });

    it('rolls back the optimistic insert on API failure', () => {
      api.create.mockReturnValue(throwError(() => new Error('500')));

      store.addItem({ name: 'Eggs', amount: '12' });

      expect(store.entities()).toHaveLength(0);
      expect(store.error()).toBe('500');
    });
  });

  describe('progress computed', () => {
    it('reports 0/0 ratio 0 when empty', () => {
      expect(store.progress()).toEqual({ total: 0, bought: 0, ratio: 0 });
    });

    it('counts bought items', () => {
      api.getAll.mockReturnValue(of([
        mockItem({ id: 'a', bought: true }),
        mockItem({ id: 'b', bought: false, order: 2000 }),
        mockItem({ id: 'c', bought: true, order: 3000 }),
      ]));
      store.loadAll();

      expect(store.progress()).toEqual({ total: 3, bought: 2, ratio: 2 / 3 });
    });
  });
});
```

## Util tests

Pure functions, no setup. The easiest tests in the codebase.

```ts
import { describe, it, expect } from 'vitest';
import { computeReorder, orderBetween, nextOrderAfter } from './grocery-list.utils';

describe('orderBetween', () => {
  it('returns midpoint of two values', () => {
    expect(orderBetween(1000, 2000)).toBe(1500);
  });

  it('returns prev + GAP when next is null', () => {
    expect(orderBetween(1000, null)).toBe(2000);
  });

  it('returns next - GAP when prev is null', () => {
    expect(orderBetween(null, 2000)).toBe(1000);
  });

  it('returns initial GAP when both are null', () => {
    expect(orderBetween(null, null)).toBe(1000);
  });
});

describe('computeReorder', () => {
  const items = [
    { id: 'a', order: 1000 },
    { id: 'b', order: 2000 },
    { id: 'c', order: 3000 },
    { id: 'd', order: 4000 },
  ];

  it('returns null when previousIndex equals currentIndex', () => {
    expect(computeReorder(items, 1, 1)).toBeNull();
  });

  it('moves an item to the end', () => {
    expect(computeReorder(items, 0, 3)).toEqual({ id: 'a', newOrder: 5000 });
  });

  it('moves an item to the start', () => {
    expect(computeReorder(items, 3, 0)).toEqual({ id: 'd', newOrder: 0 });
  });

  it('moves an item between two others', () => {
    expect(computeReorder(items, 0, 2)).toEqual({ id: 'a', newOrder: 2500 });
  });
});
```

## Component tests

Render with `TestBed.createComponent`. Provide `provideZonelessChangeDetection()`. Mock the store at the provider boundary.

```ts
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';

import { GroceryItemRow } from './grocery-item-row';
import { mockItem } from '../../testing/factories';

describe('GroceryItemRow', () => {
  it('renders item name and amount', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(GroceryItemRow);
    fixture.componentRef.setInput('item', mockItem({ name: 'Milk', amount: '2 L' }));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Milk');
    expect(text).toContain('2 L');
  });

  it('emits toggle with item id on checkbox change', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(GroceryItemRow);
    fixture.componentRef.setInput('item', mockItem({ id: 'xyz' }));
    fixture.detectChanges();

    const handler = vi.fn();
    fixture.componentInstance.toggle.subscribe(handler);
    const checkbox = fixture.nativeElement.querySelector('input[type="checkbox"]');
    checkbox.dispatchEvent(new Event('change'));

    expect(handler).toHaveBeenCalledWith('xyz');
  });
});
```

## Rules

- **Don't test framework behavior.** No "does `@if` render the right branch" — that's Angular's job.
- **Mock at the boundary closest to the system edge.** For store tests, mock the API service. For component tests, mock the store. Don't mock the SignalStore primitives themselves.
- **Test the optimistic-then-rollback path** — that's the most fragile and most valuable test in the file.
- **Fixture builders / factories** in `src/testing/factories.ts` to keep test data DRY.
- **No `fakeAsync` unless absolutely necessary** — Vitest + zoneless + synchronous observables (`of`/`throwError`) covers most cases.
- **`vi.fn()` over Jasmine spies.** This is Vitest, not Karma.

## Anti-patterns

- ❌ Testing private methods — test through the public API
- ❌ Snapshot tests for components — they break on every CSS change for no insight
- ❌ Mocking `signalStore` itself — mock its inputs (the API service), let the real store run
- ❌ Tests that pass when the implementation is empty — write the assertion that would fail

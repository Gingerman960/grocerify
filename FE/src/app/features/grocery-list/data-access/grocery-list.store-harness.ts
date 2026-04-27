import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { vi } from 'vitest';

import { GroceryListApi } from './grocery-list.api';
import { GroceryListStore } from './grocery-list.store';
import { GroceryItem } from './grocery-list.types';

type StoreApiMock = {
  getAll: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

type Harness = {
  api: StoreApiMock;
  store: InstanceType<typeof GroceryListStore>;
};

export function createStoreHarness(initialItems: GroceryItem[] = []): Harness {
  const api: StoreApiMock = {
    getAll: vi.fn().mockReturnValue(of(initialItems) as Observable<GroceryItem[]>),
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
  return { api, store: TestBed.inject(GroceryListStore) };
}

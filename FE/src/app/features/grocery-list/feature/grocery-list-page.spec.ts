import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { GroceryListApi } from '../data-access/grocery-list.api';
import { GroceryListStore } from '../data-access/grocery-list.store';
import { GroceryListPage } from './grocery-list-page';

describe('GroceryListPage (smoke)', () => {
  it('boots, renders the header, add input, and the empty state when the API has no items', () => {
    const api = {
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
    const fixture = TestBed.createComponent(GroceryListPage);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('My Grocery List');
    expect(text).toContain('Your list is empty');
    const addInput = fixture.nativeElement.querySelector(
      'app-add-item-input input[placeholder="Add an item…"]',
    ) as HTMLInputElement | null;
    expect(addInput).not.toBeNull();
  });
});

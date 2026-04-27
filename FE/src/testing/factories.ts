import { GroceryItem } from '@app/features/grocery-list/data-access/grocery-list.types';

let seq = 0;
const nextId = (): string => `mock-${++seq}`;

export function mockItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: nextId(),
    name: 'Milk',
    amount: '1 L',
    bought: false,
    order: 1000,
    ...overrides,
  };
}

export function mockItems(count: number, overrides: (i: number) => Partial<GroceryItem> = () => ({})): GroceryItem[] {
  return Array.from({ length: count }, (_, i) => mockItem({ order: (i + 1) * 1000, ...overrides(i) }));
}

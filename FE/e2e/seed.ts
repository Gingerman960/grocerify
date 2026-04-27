export type SeedItem = {
  id: string;
  name: string;
  amount: string;
  bought: boolean;
  order: number;
};

export const SEED_ITEMS: readonly SeedItem[] = [
  { id: 'e2e-01', name: 'Sourdough bread', amount: '1 loaf', bought: false, order: 1000 },
  { id: 'e2e-02', name: 'Bananas', amount: '6 pcs', bought: true, order: 2000 },
  { id: 'e2e-03', name: 'Whole milk', amount: '1 L', bought: true, order: 3000 },
  { id: 'e2e-04', name: 'Free-range eggs', amount: '12 pcs', bought: false, order: 4000 },
  { id: 'e2e-05', name: 'Roma tomatoes', amount: '500 g', bought: false, order: 5000 },
] as const;

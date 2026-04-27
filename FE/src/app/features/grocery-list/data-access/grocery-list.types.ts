export type GroceryItem = {
  readonly id: string;
  readonly name: string;
  readonly amount: string;
  readonly bought: boolean;
  readonly order: number;
};

export type GroceryItemDraft = Pick<GroceryItem, 'name' | 'amount'>;

export type GroceryItemPatch = Partial<Pick<GroceryItem, 'name' | 'amount' | 'bought' | 'order'>>;

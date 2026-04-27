import { Routes } from '@angular/router';

import { GroceryListStore } from './data-access/grocery-list.store';

export const routes: Routes = [
  {
    path: '',
    providers: [GroceryListStore],
    loadComponent: () => import('./feature/grocery-list-page').then((m) => m.GroceryListPage),
  },
];

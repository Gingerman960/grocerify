import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  {
    path: 'list',
    loadChildren: () => import('./features/grocery-list/grocery-list.routes').then((m) => m.routes),
  },
  { path: '**', redirectTo: 'list' },
];

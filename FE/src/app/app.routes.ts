import { Routes } from '@angular/router';
import { authGuard } from './route.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'list' },
  {
    path: 'list',
    loadChildren: () => import('./features/grocery-list/grocery-list.routes').then((m) => m.routes),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login-page/login-page').then((m) => m.LoginPage),
  },
  { path: '**', redirectTo: 'list' },
];

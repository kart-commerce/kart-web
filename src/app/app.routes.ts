import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'account',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  {
    path: '',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.catalogRoutes),
  },
];

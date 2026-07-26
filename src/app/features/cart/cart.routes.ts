import { Routes } from '@angular/router';

export const cartRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./cart-page/cart-page').then((m) => m.CartPage),
  },
];

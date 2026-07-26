import { Routes } from '@angular/router';

export const checkoutRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./checkout-page/checkout-page').then((m) => m.CheckoutPage),
  },
];

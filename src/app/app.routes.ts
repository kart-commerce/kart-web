import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'account',
    loadChildren: () => import('./features/account/account.routes').then((m) => m.accountRoutes),
  },
  {
    path: 'cart',
    loadChildren: () => import('./features/cart/cart.routes').then((m) => m.cartRoutes),
  },
  {
    path: 'wishlist',
    loadChildren: () => import('./features/wishlist/wishlist.routes').then((m) => m.wishlistRoutes),
  },
  {
    path: 'checkout',
    loadChildren: () => import('./features/checkout/checkout.routes').then((m) => m.checkoutRoutes),
  },
  {
    path: 'orders',
    loadChildren: () =>
      import('./features/order-tracking/order-tracking.routes').then((m) => m.orderTrackingRoutes),
  },
  {
    path: 'cookie-preferences',
    loadComponent: () =>
      import('./core/consent/cookie-preferences-page/cookie-preferences-page').then((m) => m.CookiePreferencesPage),
  },
  {
    path: '',
    loadChildren: () => import('./features/cms/cms.routes').then((m) => m.cmsRoutes),
  },
  {
    path: '',
    loadChildren: () => import('./features/catalog/catalog.routes').then((m) => m.catalogRoutes),
  },
];

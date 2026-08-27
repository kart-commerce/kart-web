import { Routes } from '@angular/router';

import { authenticatedGuard } from '../../core/auth/auth.guard';

/** WEB-25: wishlist is an authenticated-only feature (api-integration-map.md's Wishlist row). */
export const wishlistRoutes: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./wishlist-page/wishlist-page').then((m) => m.WishlistPage),
  },
];

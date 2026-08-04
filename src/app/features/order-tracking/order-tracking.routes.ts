import { Routes } from '@angular/router';

import { authenticatedGuard } from '../../core/auth/auth.guard';

/** Order history/detail is owner-scoped (api-integration-map.md's Order detail/status row) — authenticated only. */
export const orderTrackingRoutes: Routes = [
  {
    path: '',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./order-history-page/order-history-page').then((m) => m.OrderHistoryPage),
  },
  {
    path: ':orderId',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./order-detail-page/order-detail-page').then((m) => m.OrderDetailPage),
  },
];

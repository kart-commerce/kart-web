import { Routes } from '@angular/router';

export const orderTrackingRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./order-history-page/order-history-page').then((m) => m.OrderHistoryPage),
  },
  {
    path: ':orderId',
    loadComponent: () => import('./order-detail-page/order-detail-page').then((m) => m.OrderDetailPage),
  },
];

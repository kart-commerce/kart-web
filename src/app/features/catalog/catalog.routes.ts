import { Routes } from '@angular/router';

export const catalogRoutes: Routes = [
  {
    path: 'c/:categoryId',
    loadComponent: () =>
      import('./category-placeholder-page/category-placeholder-page').then(
        (m) => m.CategoryPlaceholderPage,
      ),
  },
];

import { Routes } from '@angular/router';

export const catalogRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./home-page/home-page').then((m) => m.HomePage),
  },
  {
    path: 'c/:categoryId',
    loadComponent: () => import('./category-page/category-page').then((m) => m.CategoryPage),
  },
  {
    path: 'p/:sku',
    loadComponent: () => import('./product-page/product-page').then((m) => m.ProductPage),
  },
  {
    path: 'search',
    loadComponent: () => import('./search-page/search-page').then((m) => m.SearchPage),
  },
  {
    path: 'b/:brand',
    loadComponent: () => import('./brand-page/brand-page').then((m) => m.BrandPage),
  },
  {
    path: 'compare',
    loadComponent: () => import('./compare-page/compare-page').then((m) => m.ComparePage),
  },
];

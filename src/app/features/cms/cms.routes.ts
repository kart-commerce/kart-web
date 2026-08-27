import { Routes } from '@angular/router';

const loadCmsPage = () => import('./cms-page/cms-page').then((m) => m.CmsPage);

/** WEB-51 — one route per CMS slug; friendly top-level paths rather than a generic `/cms/:slug`. */
export const cmsRoutes: Routes = [
  { path: 'about', data: { slug: 'about' }, loadComponent: loadCmsPage },
  { path: 'faq', data: { slug: 'faq' }, loadComponent: loadCmsPage },
  { path: 'terms', data: { slug: 'terms' }, loadComponent: loadCmsPage },
  { path: 'privacy-policy', data: { slug: 'privacy-policy' }, loadComponent: loadCmsPage },
  { path: 'help', data: { slug: 'help' }, loadComponent: loadCmsPage },
];

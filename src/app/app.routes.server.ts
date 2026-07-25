import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Route prerender policy (seo.md §11): authenticated/transactional routes
 * are CSR-only (never SSR'd or prerendered — no SEO value, and per
 * security.md the BFF session cookie is the only thing that should ever see
 * these pages server-side); catalog/browse routes are SSR'd per-request
 * (too frequently-changing/personalized for build-time prerendering).
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'account/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];

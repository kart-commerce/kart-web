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
  // Authenticated/transactional, no SEO value (seo.md §1 CSR table) — SSR'ing any of these
  // risks a session-consistency race between the SSR pod and the requesting browser's own
  // in-flight auth/cart/wishlist state, for zero organic-search benefit.
  {
    path: 'cart/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'checkout/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'wishlist/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'orders/**',
    renderMode: RenderMode.Client,
  },
  // Reads the `kart_consent` cookie client-side only (ConsentService); SSR'ing would always
  // render the unchecked defaults and then flash to the real saved choices post-hydration.
  {
    path: 'cookie-preferences',
    renderMode: RenderMode.Client,
  },
  // seo.md §11 tier 2 — CMS pages are prerendered at build time (+ webhook-triggered rebuild
  // on publish, an infra concern outside this repo), never per-request SSR: editorially
  // controlled, infrequently-changing content doesn't justify per-request render cost.
  {
    path: 'about',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'faq',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'terms',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'privacy-policy',
    renderMode: RenderMode.Prerender,
  },
  {
    path: 'help',
    renderMode: RenderMode.Prerender,
  },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];

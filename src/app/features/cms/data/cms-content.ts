export interface CmsPageContent {
  readonly slug: string;
  readonly title: string;
  readonly metaDescription: string;
  readonly bodyHtml: string;
}

/**
 * Stands in for a real headless-CMS-backed read (seo.md §11 tier 2: "build-time prerender +
 * webhook-triggered rebuild" — the webhook/rebuild-on-publish mechanism is CI/infra, not
 * client-app code, and isn't reproducible in this repo alone). The important, *buildable* part
 * — the tier-2 prerender-not-per-request-SSR route classification — is wired in
 * `app.routes.server.ts`.
 */
export const CMS_PAGES: readonly CmsPageContent[] = [
  {
    slug: 'about',
    title: 'About Kart',
    metaDescription: 'Learn about Kart, our mission, and how we work.',
    bodyHtml: `<p>Kart is a modern storefront for browsing, comparing, and buying the products you care about — backed by a platform built for reliability at scale.</p>`,
  },
  {
    slug: 'faq',
    title: 'Frequently Asked Questions',
    metaDescription: 'Answers to common questions about ordering, shipping, and returns on Kart.',
    bodyHtml: `<h2>Shipping</h2><p>Most orders ship within 1-2 business days.</p><h2>Returns</h2><p>Items delivered within the last 30 days are eligible for a self-service return from your order detail page.</p>`,
  },
  {
    slug: 'terms',
    title: 'Terms of Service',
    metaDescription: "Kart's terms of service governing use of this site.",
    bodyHtml: `<p>By using Kart, you agree to these terms. This is placeholder legal copy pending final review.</p>`,
  },
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    metaDescription: "Kart's privacy policy — how we collect, use, and protect your data.",
    bodyHtml: `<p>This policy describes what personal data Kart collects and how it's used. See your <a href="/account/privacy">account privacy settings</a> to exercise your data rights.</p>`,
  },
  {
    slug: 'help',
    title: 'Help Center',
    metaDescription: 'Get help with your Kart account, orders, and more.',
    bodyHtml: `<p>Need a hand? Check our <a href="/faq">FAQ</a> or reach out to Support from your <a href="/account/profile">account page</a>.</p>`,
  },
];

export function getCmsPage(slug: string): CmsPageContent | undefined {
  return CMS_PAGES.find((page) => page.slug === slug);
}

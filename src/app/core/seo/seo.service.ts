import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

const CANONICAL_LINK_ID = 'kart-canonical-link';
const STRUCTURED_DATA_SCRIPT_ID = 'kart-structured-data';

/**
 * seo.md §2/§3/§6 — meta tags, JSON-LD structured data, and canonical URLs, all populated
 * server-side during SSR from the same data the page's own resolver/signal already fetched
 * (never patched client-side post-hydration, which would be invisible to a crawler that
 * doesn't execute a full render pass). One shared service so every SSR'd page (Home, Category,
 * PLP, PDP, Brand, Search, CMS) sets these the same way, not per-page bespoke DOM poking.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);

  setTitle(pageTitle: string): void {
    this.title.setTitle(`${pageTitle} | Kart`);
  }

  setDescription(description: string): void {
    this.meta.updateTag({ name: 'description', content: description.slice(0, 155) });
  }

  setRobots(directive: 'index, follow' | 'noindex, follow' = 'index, follow'): void {
    this.meta.updateTag({ name: 'robots', content: directive });
  }

  /** seo.md §6 — sort/view/session-tracking query params are stripped; pagination params are kept. */
  setCanonicalUrl(url: string): void {
    this.upsertLink('canonical', CANONICAL_LINK_ID, url);
  }

  setOpenGraph(data: { title: string; description: string; image?: string; type?: string; url: string }): void {
    this.meta.updateTag({ property: 'og:title', content: data.title });
    this.meta.updateTag({ property: 'og:description', content: data.description.slice(0, 200) });
    this.meta.updateTag({ property: 'og:type', content: data.type ?? 'website' });
    this.meta.updateTag({ property: 'og:url', content: data.url });
    if (data.image) {
      this.meta.updateTag({ property: 'og:image', content: data.image });
    }
  }

  /** seo.md §3 — one JSON-LD block per page; replaced wholesale on navigation, never appended. */
  setStructuredData(data: Readonly<Record<string, unknown>>): void {
    let script = this.document.getElementById(STRUCTURED_DATA_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.id = STRUCTURED_DATA_SCRIPT_ID;
      this.document.head.appendChild(script);
    }
    script.text = JSON.stringify(data);
  }

  clearStructuredData(): void {
    this.document.getElementById(STRUCTURED_DATA_SCRIPT_ID)?.remove();
  }

  private upsertLink(rel: string, id: string, href: string): void {
    let link = this.document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = this.document.createElement('link');
      link.rel = rel;
      link.id = id;
      this.document.head.appendChild(link);
    }
    link.href = href;
  }
}

import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { SeoService } from '../../../core/seo/seo.service';
import { getCmsPage } from '../data/cms-content';

/**
 * WEB-51 — CMS page rendering (About/FAQ/Terms/Privacy Policy/Help). Prerendered at build time
 * (seo.md §11 tier 2 — see `app.routes.server.ts`'s `RenderMode.Prerender` entry for `cms/:slug`),
 * not per-request SSR: editorially-controlled, infrequently-changing content doesn't justify
 * per-request render cost.
 */
@Component({
  selector: 'kart-cms-page',
  template: `
    @if (page(); as page) {
      <article class="kart-cms-page">
        <h1>{{ page.title }}</h1>
        <div [innerHTML]="page.bodyHtml"></div>
      </article>
    } @else {
      <p>Page not found.</p>
    }
  `,
  styles: [
    `
      .kart-cms-page {
        max-width: 720px;
        margin: 0 auto;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CmsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);

  readonly page = toSignal(this.route.data.pipe(map((data) => getCmsPage((data['slug'] as string) ?? ''))), {
    initialValue: undefined,
  });

  constructor() {
    effect(() => {
      const page = this.page();
      if (!page) {
        return;
      }
      this.seo.setTitle(page.title);
      this.seo.setDescription(page.metaDescription);
      this.seo.setCanonicalUrl(`/cms/${page.slug}`);
      this.seo.setStructuredData({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: page.title,
        description: page.metaDescription,
      });
    });
  }
}

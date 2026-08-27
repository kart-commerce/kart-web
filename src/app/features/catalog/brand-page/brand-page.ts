import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { KartInput, Spinner } from '../../../shared/ui';
import { SeoService } from '../../../core/seo/seo.service';
import { ProductCard } from '../product-card/product-card';
import { ProductService, ProductSort } from '../data/product.service';

/** WEB-20 — brand pages: a filtered PLP view keyed on the brand facet (architecture.md's `catalog/` folder note — not a new backend service). */
@Component({
  selector: 'kart-brand-page',
  imports: [Spinner, ProductCard, KartInput],
  templateUrl: './brand-page.html',
  styleUrl: './brand-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly seo = inject(SeoService);

  readonly brand = toSignal(this.route.paramMap.pipe(map((params) => params.get('brand') ?? '')), {
    initialValue: '',
  });

  readonly sort = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('sort') as ProductSort) ?? 'relevance')),
    { initialValue: 'relevance' as ProductSort },
  );

  readonly products = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('brand') ?? ''),
      switchMap((brand) =>
        this.route.queryParamMap.pipe(
          map((query) => (query.get('sort') as ProductSort) ?? 'relevance'),
          switchMap((sort) => this.productService.listByBrand(brand, sort)),
        ),
      ),
    ),
  );

  constructor() {
    effect(() => {
      const brand = this.brand();
      if (!brand) {
        return;
      }
      this.seo.setTitle(brand);
      this.seo.setDescription(`Shop all ${brand} products at Kart.`);
      this.seo.setCanonicalUrl(`/b/${brand}`);
      this.seo.setStructuredData({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${brand} products`,
        itemListElement: (this.products() ?? []).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `/p/${product.sku}`,
        })),
      });
    });
  }

  changeSort(sort: ProductSort): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { sort }, queryParamsHandling: 'merge' });
  }
}

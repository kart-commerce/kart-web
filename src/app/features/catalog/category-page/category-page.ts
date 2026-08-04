import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { KartInput, Spinner } from '../../../shared/ui';
import { SeoService } from '../../../core/seo/seo.service';
import { ProductCard } from '../product-card/product-card';
import { ProductService, ProductSort, sortProducts } from '../data/product.service';

function formatCategoryName(categoryId: string): string {
  return categoryId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Product listing page (PLP) for a category.
 *
 * WEB-14 — sort and the brand facet are both synced to the URL's query string (never held
 * only in component state), so a specific filter/sort combination is bookmarkable/shareable
 * and independently indexable, per seo.md §1's PLP row. The canonical URL (seo.md §6) strips
 * `sort`/`view`/session-tracking params (they don't represent distinct content) but keeps a
 * pagination `page` param — this page has no pagination yet, so canonical == the current
 * brand-filtered path today, and gains a kept `page` param the moment pagination lands.
 */
@Component({
  selector: 'kart-category-page',
  imports: [Spinner, ProductCard, KartInput],
  templateUrl: './category-page.html',
  styleUrl: './category-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly seo = inject(SeoService);

  private readonly categoryId$ = this.route.paramMap.pipe(map((params) => params.get('categoryId') ?? ''));
  readonly categoryId = toSignal(this.categoryId$, { initialValue: '' });
  protected readonly categoryName = () => formatCategoryName(this.categoryId());

  readonly sort = toSignal(
    this.route.queryParamMap.pipe(map((params) => (params.get('sort') as ProductSort) ?? 'relevance')),
    { initialValue: 'relevance' as ProductSort },
  );
  readonly selectedBrand = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('brand'))), {
    initialValue: null,
  });

  private readonly allProducts = toSignal(
    this.categoryId$.pipe(switchMap((categoryId) => this.productService.listByCategory(categoryId, 'relevance'))),
  );

  protected readonly availableBrands = computed(() => {
    const products = this.allProducts();
    if (!products) {
      return [];
    }
    return [...new Set(products.map((product) => product.brand))].sort();
  });

  readonly products = computed(() => {
    const products = this.allProducts();
    if (!products) {
      return undefined;
    }
    const brand = this.selectedBrand();
    const filtered = brand ? products.filter((product) => product.brand === brand) : products;
    return sortProducts(filtered, this.sort());
  });

  constructor() {
    effect(() => {
      const categoryName = this.categoryName();
      this.seo.setTitle(categoryName);
      this.seo.setDescription(`Shop ${categoryName} at Kart.`);
      this.seo.setCanonicalUrl(this.buildCanonicalUrl());
      this.seo.setStructuredData({
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: categoryName,
        itemListElement: (this.products() ?? []).map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `/p/${product.sku}`,
        })),
      });
    });
  }

  changeSort(sort: ProductSort): void {
    this.updateQueryParams({ sort: sort === 'relevance' ? null : sort });
  }

  changeBrand(brand: string | null): void {
    this.updateQueryParams({ brand: brand || null });
  }

  private updateQueryParams(patch: Record<string, string | null>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: patch,
      queryParamsHandling: 'merge',
    });
  }

  private buildCanonicalUrl(): string {
    // Sort/view/session params are deliberately excluded — only the brand facet is kept
    // (it changes the actual listed content, not just its ordering/view).
    const brand = this.selectedBrand();
    const base = `/c/${this.categoryId()}`;
    return brand ? `${base}?brand=${encodeURIComponent(brand)}` : base;
  }
}

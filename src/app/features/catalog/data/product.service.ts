import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Product, ProductSummary, ProductVariant } from './models';
import { MOCK_PRODUCTS } from './mock-catalog';

export type ProductSort = 'relevance' | 'price-asc' | 'price-desc' | 'rating';

/**
 * Stands in for kart-product-service's `GET /v1/products/{sku}` and
 * `GET /v1/product-groups/{id}/variants` until that contract is vendored into this repo — see
 * mock-catalog.ts's note. Swapping this for a generated client only touches this file.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  getBySku(sku: string): Observable<Product | undefined> {
    return of(MOCK_PRODUCTS.find((product) => product.sku === sku));
  }

  listVariants(groupId: string): Observable<readonly ProductVariant[]> {
    const product = MOCK_PRODUCTS.find((candidate) => candidate.groupId === groupId);
    return of(product?.variants ?? []);
  }

  listByCategory(categoryId: string, sort: ProductSort = 'relevance'): Observable<readonly ProductSummary[]> {
    const matches = MOCK_PRODUCTS.filter((product) => product.categoryId === categoryId);
    return of(sortProducts(matches, sort));
  }

  /** WEB-20 — brand pages: a filtered PLP view keyed on the brand facet, not a new backend service/aggregate. */
  listByBrand(brand: string, sort: ProductSort = 'relevance'): Observable<readonly ProductSummary[]> {
    const matches = MOCK_PRODUCTS.filter((product) => product.brand.toLowerCase() === brand.toLowerCase());
    return of(sortProducts(matches, sort));
  }

  listBrands(): Observable<readonly string[]> {
    return of([...new Set(MOCK_PRODUCTS.map((product) => product.brand))].sort());
  }

  listRelated(sku: string): Observable<readonly ProductSummary[]> {
    const product = MOCK_PRODUCTS.find((candidate) => candidate.sku === sku);
    if (!product) {
      return of([]);
    }
    const related = MOCK_PRODUCTS.filter(
      (candidate) => candidate.sku !== sku && candidate.categoryId === product.categoryId,
    );
    return of(related.slice(0, 4));
  }

  /** Top-rated products across all categories, for the homepage's trending rail. */
  listFeatured(limit = 8): Observable<readonly ProductSummary[]> {
    return of(sortProducts(MOCK_PRODUCTS, 'rating').slice(0, limit));
  }
}

export function sortProducts(
  products: readonly ProductSummary[],
  sort: ProductSort,
): readonly ProductSummary[] {
  const sorted = [...products];
  switch (sort) {
    case 'price-asc':
      return sorted.sort((a, b) => a.price.amount - b.price.amount);
    case 'price-desc':
      return sorted.sort((a, b) => b.price.amount - a.price.amount);
    case 'rating':
      return sorted.sort((a, b) => b.ratingAverage - a.ratingAverage);
    case 'relevance':
    default:
      return sorted;
  }
}

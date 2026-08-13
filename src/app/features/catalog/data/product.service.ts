import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { placeholderImage } from '../../../shared/util/placeholder-image';
import { DefaultService as ProductApi } from '../../../core/http/generated/product/v1';
import { BASE_PATH as PRODUCT_BASE_PATH } from '../../../core/http/generated/product/v1/variables';
import { ProductResponse } from '../../../core/http/generated/product/v1/model/productResponse';
import { DefaultService as InventoryApi } from '../../../core/http/generated/inventory/v1';
import { DefaultService as SearchApi } from '../../../core/http/generated/search/v1';
import { Product, ProductSummary, ProductVariant } from './models';
import { MOCK_PRODUCTS } from './mock-catalog';
import { toProductSummary } from './search-result-mapper';

export type ProductSort = 'relevance' | 'price-asc' | 'price-desc' | 'rating';

/** kart-product-service's own vendored OpenAPI contract predates its `productGroupId` field. */
interface ProductResponseWithGroup extends ProductResponse {
  readonly productGroupId: string;
}

function toSearchSort(sort: ProductSort): 'relevance' | 'price_asc' | 'price_desc' | 'rating_desc' {
  switch (sort) {
    case 'price-asc':
      return 'price_asc';
    case 'price-desc':
      return 'price_desc';
    case 'rating':
      return 'rating_desc';
    case 'relevance':
    default:
      return 'relevance';
  }
}

/**
 * `getBySku`/`listVariants` call the real kart-product-service (`GET /v1/products/{sku}`,
 * `GET /v1/product-groups/{id}/variants`) joined client-side with kart-inventory-service's
 * `GET /v1/inventory/{sku}` for per-variant availability — see `models.ts`'s doc comment.
 * `listByCategory` calls the real kart-search-service (`GET /v1/search?category=`), the only
 * real facility for category-scoped browse — kart-product-service itself exposes no list/browse
 * endpoint (see `contracts/kart-product-service.api-contract.yaml`).
 * `listByBrand`/`listBrands`/`listRelated`/`listFeatured` remain mocked: those back brand-browse
 * pages and the homepage's trending rail, not the Normal Shopping & Purchase Journey's own
 * Search→PDP→Add-to-Cart sequence, and are out of scope for this flow's build.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly productApi = inject(ProductApi);
  private readonly inventoryApi = inject(InventoryApi);
  private readonly searchApi = inject(SearchApi);
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(PRODUCT_BASE_PATH, { optional: true }) ?? '';

  getBySku(sku: string): Observable<Product | undefined> {
    return this.productApi.getProduct(sku).pipe(
      switchMap((primary) => {
        const groupId = (primary as ProductResponseWithGroup).productGroupId;
        return this.listVariants(groupId).pipe(
          map((variants) => this.toProduct(primary as ProductResponseWithGroup, groupId, variants)),
        );
      }),
      catchError(() => of(undefined)),
    );
  }

  listVariants(groupId: string): Observable<readonly ProductVariant[]> {
    return this.http.get<ProductResponseWithGroup[]>(`${this.basePath}/v1/product-groups/${groupId}/variants`).pipe(
      switchMap((siblings) => {
        if (siblings.length === 0) {
          return of([]);
        }
        return forkJoin(siblings.map((sibling) => this.toVariant(sibling)));
      }),
      catchError(() => of([])),
    );
  }

  /** `categoryIds` — the target category's own leaf descendants (see `CategoryNavService.resolveLeafCategoryIds`), since the search index matches a product's own leaf categoryId only. */
  listByCategory(categoryIds: readonly string[], sort: ProductSort = 'relevance'): Observable<readonly ProductSummary[]> {
    if (categoryIds.length === 0) {
      return of([]);
    }
    return this.searchApi
      .searchProducts(undefined, [...categoryIds], undefined, undefined, undefined, toSearchSort(sort))
      .pipe(
        map((response) => response.results.map(toProductSummary)),
        catchError(() => of([])),
      );
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

  private toProduct(primary: ProductResponseWithGroup, groupId: string, variants: readonly ProductVariant[]): Product {
    const selfVariant = variants.find((v) => v.sku === primary.sku);
    return {
      sku: primary.sku,
      groupId,
      name: primary.name,
      brand: primary.brand ?? '',
      categoryId: primary.category.id ?? '',
      thumbnailUrl: placeholderImage(primary.sku, primary.name),
      price: primary.price,
      ratingAverage: primary.ratingSummary?.avg ?? 0,
      ratingCount: primary.ratingSummary?.count ?? 0,
      inStock: selfVariant?.inStock ?? true,
      description: primary.description ?? '',
      images: [placeholderImage(primary.sku, primary.name)],
      attributes: attributesRecord(primary.attributes),
      variants,
    };
  }

  private toVariant(response: ProductResponseWithGroup): Observable<ProductVariant> {
    return this.inventoryApi.getStockLevel(response.sku).pipe(
      map((stock) => ({
        sku: response.sku,
        attributes: attributesRecord(response.attributes),
        price: response.price,
        inStock: stock.availableQty > 0,
      })),
      catchError(() =>
        of({
          sku: response.sku,
          attributes: attributesRecord(response.attributes),
          price: response.price,
          // No stock signal reachable — assumed orderable rather than hiding the variant outright;
          // the real availability gate is the cart/order-time reserve call, not this display hint.
          inStock: true,
        }),
      ),
    );
  }
}

function attributesRecord(attributes: ProductResponse['attributes']): Record<string, string> {
  const record: Record<string, string> = {};
  if (attributes?.color) {
    record['Color'] = attributes.color;
  }
  if (attributes?.size) {
    record['Size'] = attributes.size;
  }
  for (const [key, value] of Object.entries(attributes?.extendedAttributes ?? {})) {
    if (value != null) {
      record[key] = String(value);
    }
  }
  return record;
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

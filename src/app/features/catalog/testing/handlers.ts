import { HttpResponse, http } from 'msw';

import { Product } from '../data/models';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS, CATALOG_RATINGS, CATALOG_REVIEWS } from '../../../../testing/fixtures/catalog.fixtures';

/**
 * WEB-4 — MSW handlers for kart-category-service, kart-product-service, kart-search-service,
 * kart-review-service (catalog feature slice). Response shapes are hand-mapped from the shared
 * `MOCK_PRODUCTS` fixture (api-strategy.md §3) into each real generated client's contract shape
 * — the two aren't structurally identical (`Product` is this app's own read-model-friendly
 * shape; `ProductResponse`/`SearchResultItem` are kart-product-service/kart-search-service's own
 * contracts), so the mapping happens once, here, rather than duplicating catalog data a third
 * time.
 */
function toProductResponse(product: Product) {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: { id: product.categoryId, name: product.categoryId },
    brand: product.brand,
    price: product.price,
    status: 'Active' as const,
    attributes: { extendedAttributes: product.attributes },
    ratingSummary: { avg: product.ratingAverage, count: product.ratingCount },
  };
}

function toSearchResultItem(product: Product) {
  return {
    sku: product.sku,
    name: product.name,
    description: product.description,
    brand: product.brand,
    category: { id: product.categoryId, name: product.categoryId },
    price: product.price,
    availability: 'Active' as const,
    rating: { avg: product.ratingAverage, count: product.ratingCount },
  };
}

export const catalogHandlers = [
  http.get('*/categories', ({ request }) => {
    const parentId = new URL(request.url).searchParams.get('parentId');
    const matches = CATALOG_CATEGORIES.filter((category) => (category.parentId ?? null) === parentId);
    return HttpResponse.json(matches);
  }),

  http.get('*/v1/products/:sku', ({ params }) => {
    const product = CATALOG_PRODUCTS.find((item) => item.sku === params['sku']);
    if (!product) {
      return HttpResponse.json({ code: 'not_found', message: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json(toProductResponse(product));
  }),

  http.get('*/v1/search', ({ request }) => {
    const query = new URL(request.url).searchParams.get('q')?.toLowerCase() ?? '';
    const matches = CATALOG_PRODUCTS.filter((product) => product.name.toLowerCase().includes(query));
    return HttpResponse.json({
      results: matches.map(toSearchResultItem),
      facets: {},
      pagination: { page: 0, size: matches.length, totalHits: matches.length, totalHitsIsApproximate: false },
      truncated: false,
    });
  }),

  http.get('*/v1/product-ratings/', ({ request }) => {
    const sku = new URL(request.url).searchParams.get('sku');
    const rating = sku ? CATALOG_RATINGS[sku] : undefined;
    if (!rating) {
      return HttpResponse.json({ code: 'not_found', message: 'No rating for SKU' }, { status: 404 });
    }
    return HttpResponse.json({ sku: rating.sku, avg: rating.average, count: rating.count });
  }),

  http.get('*/v1/recommendations/:userId', ({ params }) => {
    const items = CATALOG_PRODUCTS.slice(0, 8).map((product) => ({
      sku: product.sku,
      score: product.ratingAverage,
      source: 'Fallback' as const,
    }));
    return HttpResponse.json({
      userId: String(params['userId']),
      items,
      generatedAt: '2026-08-01T00:00:00.000Z',
      availabilityFilterApplied: true,
    });
  }),

  http.get('*/v1/reviews', ({ request }) => {
    const sku = new URL(request.url).searchParams.get('sku');
    const items = CATALOG_REVIEWS.filter((review) => review.sku === sku && review.status === 'published');
    return HttpResponse.json({
      items: items.map((review) => ({
        reviewId: review.reviewId,
        orderId: `ord-${review.reviewId}`,
        sku: review.sku,
        userId: 'usr-fixture-001',
        rating: review.rating,
        bodyText: review.body,
        status: 'Published',
        createdAt: review.createdAt,
        lastEditedAt: review.createdAt,
      })),
      page: 0,
      pageSize: items.length,
      totalCount: items.length,
    });
  }),
];

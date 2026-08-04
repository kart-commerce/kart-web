import { Category } from '../../app/core/http/generated/category/v1/model/category';
import { MOCK_PRODUCTS, MOCK_RATINGS, MOCK_REVIEWS } from '../../app/features/catalog/data/mock-catalog';

/**
 * api-strategy.md §3 — a single fixture module per bounded context, imported by both MSW
 * handlers and (where useful) component tests, so a test and its mock server never disagree
 * about shape. Re-exports the catalog feature's own `MOCK_PRODUCTS`/etc. (already shaped like
 * the real `Product`/`Review` models — see mock-catalog.ts's own note) rather than inventing a
 * second, parallel set of catalog fixtures.
 */
export const CATALOG_PRODUCTS = MOCK_PRODUCTS;
export const CATALOG_RATINGS = MOCK_RATINGS;
export const CATALOG_REVIEWS = MOCK_REVIEWS;

/** Matches kart-category-service's `Category` contract shape — a 2-level taxonomy. */
export const CATALOG_CATEGORIES: readonly Category[] = [
  { categoryId: 'electronics', name: 'Electronics', depth: 1, status: 'active', ancestorPath: [] },
  { categoryId: 'fashion', name: 'Fashion', depth: 1, status: 'active', ancestorPath: [] },
  { categoryId: 'home-kitchen', name: 'Home & Kitchen', depth: 1, status: 'active', ancestorPath: [] },
  { categoryId: 'sports-outdoors', name: 'Sports & Outdoors', depth: 1, status: 'active', ancestorPath: [] },
];

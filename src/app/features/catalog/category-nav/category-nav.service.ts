import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, switchMap } from 'rxjs';

import { Category } from '../../../core/http/generated/category/v1/model/category';
import { DefaultService } from '../../../core/http/generated/category/v1/api/default.service';
import { CategoryTreeNode } from './category-tree-node';

/** kart-search-service's combined category/price/rating facet-filter cap (see `product.service.ts`). */
const MAX_CATEGORY_FILTER_VALUES = 5;

/**
 * Loads one level of kart-category-service's parent-scoped `GET /categories`
 * at a time (omitting `parentId` returns depth-1 categories). Callers fetch
 * children lazily, on demand, instead of prefetching the whole tree — the
 * previous eager recursive implementation issued one request per node and
 * could balloon into thousands of calls for a wide, deep catalog.
 */
@Injectable({ providedIn: 'root' })
export class CategoryNavService {
  private readonly categoryApi = inject(DefaultService);

  loadRoot(): Observable<CategoryTreeNode[]> {
    return this.loadLevel(undefined);
  }

  loadChildren(parentId: string): Observable<CategoryTreeNode[]> {
    return this.loadLevel(parentId);
  }

  /** Single-category lookup by id (e.g. the category page's own title) - real `GET /v1/categories/{id}`. */
  getCategory(categoryId: string): Observable<Category | undefined> {
    return this.categoryApi.getCategory(categoryId).pipe(catchError(() => of(undefined)));
  }

  /**
   * Products are indexed under their own leaf categoryId only (kart-search-service does no
   * ancestor-path matching), so browsing a non-leaf category (the common case — top-level nav
   * items are parents) requires resolving its leaf descendants and filtering search by those
   * instead. Scoped to one clicked category's own subtree, not a whole-tree prefetch.
   */
  resolveLeafCategoryIds(categoryId: string): Observable<readonly string[]> {
    return this.loadChildren(categoryId).pipe(
      switchMap((children) => {
        if (children.length === 0) {
          return of([categoryId]);
        }
        return forkJoin(children.map((child) => this.resolveLeafCategoryIds(child.categoryId))).pipe(
          map((leafGroups) => leafGroups.flat().slice(0, MAX_CATEGORY_FILTER_VALUES)),
        );
      }),
      catchError(() => of([categoryId])),
    );
  }

  private loadLevel(parentId: string | undefined): Observable<CategoryTreeNode[]> {
    return this.categoryApi
      .listCategories(parentId)
      .pipe(map((categories) => categories.filter((category) => category.status === 'active')));
  }
}

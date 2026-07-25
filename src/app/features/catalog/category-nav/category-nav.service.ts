import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { DefaultService } from '../../../core/http/generated/category/v1/api/default.service';
import { CategoryTreeNode } from './category-tree-node';

/**
 * Builds the full active category tree from kart-category-service's
 * parent-scoped `GET /categories` (omitting `parentId` returns only depth-1
 * categories — the contract is designed for exactly this level-by-level
 * navigation-tree usage, not a single fetch-everything call). Each level's
 * children are fetched in parallel (architecture.md: SSR fan-out must be
 * parallel, not serial), and recursion stops at depth 4 — the contract's own
 * max-depth invariant — without an extra probe call per leaf.
 */
@Injectable({ providedIn: 'root' })
export class CategoryNavService {
  private readonly categoryApi = inject(DefaultService);

  loadTree(): Observable<CategoryTreeNode[]> {
    return this.loadLevel(undefined);
  }

  private loadLevel(parentId: string | undefined): Observable<CategoryTreeNode[]> {
    return this.categoryApi.listCategories(parentId).pipe(
      switchMap((categories) => {
        const active = categories.filter((category) => category.status === 'active');
        if (active.length === 0) {
          return of([]);
        }

        const withChildren: Observable<CategoryTreeNode>[] = active.map((category) =>
          category.depth >= 4
            ? of({ ...category, children: [] })
            : this.loadLevel(category.categoryId).pipe(
                map((children) => ({ ...category, children })),
              ),
        );

        return forkJoin(withChildren);
      }),
    );
  }
}

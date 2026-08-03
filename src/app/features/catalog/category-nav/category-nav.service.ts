import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { DefaultService } from '../../../core/http/generated/category/v1/api/default.service';
import { CategoryTreeNode } from './category-tree-node';

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

  private loadLevel(parentId: string | undefined): Observable<CategoryTreeNode[]> {
    return this.categoryApi
      .listCategories(parentId)
      .pipe(map((categories) => categories.filter((category) => category.status === 'active')));
  }
}

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map, switchMap } from 'rxjs';

import { Spinner } from '../../../shared/ui';
import { ProductCard } from '../product-card/product-card';
import { ProductService, ProductSort } from '../data/product.service';

function formatCategoryName(categoryId: string): string {
  return categoryId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Product listing page (PLP) for a category — J1/J3's "browse categories" step. */
@Component({
  selector: 'kart-category-page',
  imports: [Spinner, ProductCard],
  templateUrl: './category-page.html',
  styleUrl: './category-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);

  private readonly categoryId$ = this.route.paramMap.pipe(map((params) => params.get('categoryId') ?? ''));

  readonly categoryId = toSignal(this.categoryId$, { initialValue: '' });
  protected readonly categoryName = () => formatCategoryName(this.categoryId());

  readonly sort = signal<ProductSort>('relevance');

  readonly products = toSignal(
    combineLatest([this.categoryId$, toObservable(this.sort)]).pipe(
      switchMap(([categoryId, sort]) => this.productService.listByCategory(categoryId, sort)),
    ),
  );

  changeSort(sort: ProductSort): void {
    this.sort.set(sort);
  }
}

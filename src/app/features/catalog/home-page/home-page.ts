import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { ProductCard } from '../product-card/product-card';
import { ProductService } from '../data/product.service';
import { CategoryNavService } from '../category-nav/category-nav.service';

interface FeaturedCategory {
  readonly categoryId: string;
  readonly label: string;
  readonly icon: string;
}

/** kart-category-service carries no icon field — a display-only fallback keyed on name. */
const CATEGORY_ICONS: Readonly<Record<string, string>> = {
  Electronics: '💻',
  "Men's Fashion": '👕',
  "Women's Fashion": '👗',
  'Home & Kitchen': '🏠',
  'Sports & Outdoors': '🏕️',
  Automotive: '🚗',
  'Beauty & Personal Care': '💄',
  'Books & Media': '📚',
  'Pet Supplies': '🐾',
  'Toys & Games': '🧸',
};
const DEFAULT_CATEGORY_ICON = '🛍️';
const FEATURED_CATEGORY_COUNT = 4;

/** Storefront landing page — hero, category shortcuts, and a trending-products rail. */
@Component({
  selector: 'kart-home-page',
  imports: [RouterLink, ProductCard],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  private readonly productService = inject(ProductService);
  private readonly categoryNav = inject(CategoryNavService);

  protected readonly featuredCategories = toSignal(
    this.categoryNav.loadRoot().pipe(
      map((categories): readonly FeaturedCategory[] =>
        categories.slice(0, FEATURED_CATEGORY_COUNT).map((category) => ({
          categoryId: category.categoryId,
          label: category.name,
          icon: CATEGORY_ICONS[category.name] ?? DEFAULT_CATEGORY_ICON,
        })),
      ),
    ),
    { initialValue: [] as readonly FeaturedCategory[] },
  );

  readonly featuredProducts = toSignal(this.productService.listFeatured(), { initialValue: [] });
}

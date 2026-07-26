import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { ProductCard } from '../product-card/product-card';
import { ProductService } from '../data/product.service';

interface FeaturedCategory {
  readonly categoryId: string;
  readonly label: string;
  readonly icon: string;
}

const FEATURED_CATEGORIES: readonly FeaturedCategory[] = [
  { categoryId: 'electronics', label: 'Electronics', icon: '💻' },
  { categoryId: 'fashion', label: 'Fashion', icon: '👕' },
  { categoryId: 'home-kitchen', label: 'Home & Kitchen', icon: '🏠' },
  { categoryId: 'sports-outdoors', label: 'Sports & Outdoors', icon: '🏕️' },
];

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

  protected readonly featuredCategories = FEATURED_CATEGORIES;

  readonly featuredProducts = toSignal(this.productService.listFeatured(), { initialValue: [] });
}

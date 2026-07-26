import { DatePipe, KeyValuePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { Badge, RatingStars, Spinner } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { AuthService } from '../../../core/auth/auth.service';
import { CartService } from '../../cart/data/cart.service';
import { WishlistService } from '../../wishlist/data/wishlist.service';
import { PromoBadge } from '../../pricing-promotions/promo-badge/promo-badge';
import { PricingService } from '../../pricing-promotions/data/pricing.service';
import { ProductCard } from '../product-card/product-card';
import { ProductService } from '../data/product.service';
import { ReviewService } from '../data/review.service';
import { RecommendationService } from '../data/recommendation.service';
import { Product, ProductVariant } from '../data/models';

/** Groups a product's variants into { attributeName: [values...] } for the variant-picker UI. */
function variantAxes(variants: readonly ProductVariant[]): ReadonlyMap<string, readonly string[]> {
  const axes = new Map<string, string[]>();
  for (const variant of variants) {
    for (const [key, value] of Object.entries(variant.attributes)) {
      const values = axes.get(key) ?? [];
      if (!values.includes(value)) {
        values.push(value);
      }
      axes.set(key, values);
    }
  }
  return axes;
}

@Component({
  selector: 'kart-product-page',
  imports: [RouterLink, DatePipe, KeyValuePipe, Spinner, Badge, RatingStars, MoneyPipe, PromoBadge, ProductCard],
  templateUrl: './product-page.html',
  styleUrl: './product-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly reviewService = inject(ReviewService);
  private readonly recommendationService = inject(RecommendationService);
  private readonly pricingService = inject(PricingService);
  private readonly authService = inject(AuthService);
  private readonly cartService = inject(CartService);
  protected readonly wishlistService = inject(WishlistService);

  private readonly sku$ = this.route.paramMap.pipe(map((params) => params.get('sku') ?? ''));

  readonly product = toSignal(this.sku$.pipe(switchMap((sku) => this.productService.getBySku(sku))), {
    initialValue: undefined as Product | undefined,
  });

  readonly selectedImageIndex = signal(0);
  readonly quantity = signal(1);
  readonly justAdded = signal(false);

  /** Defaults to the product's own sku (its own variant) whenever a new product loads. */
  private readonly userSelectedSku = signal<string | null>(null);

  readonly selectedVariant = computed<ProductVariant | undefined>(() => {
    const product = this.product();
    if (!product) {
      return undefined;
    }
    const selectedSku = this.userSelectedSku();
    return product.variants.find((variant) => variant.sku === selectedSku) ?? product.variants[0];
  });

  readonly axes = computed(() => {
    const product = this.product();
    return product ? variantAxes(product.variants) : new Map<string, readonly string[]>();
  });

  readonly promotion = toSignal(
    this.sku$.pipe(switchMap((sku) => this.pricingService.activePromotionFor(sku))),
    { initialValue: undefined },
  );

  readonly rating = toSignal(this.sku$.pipe(switchMap((sku) => this.reviewService.getRating(sku))), {
    initialValue: undefined,
  });

  readonly reviews = toSignal(this.sku$.pipe(switchMap((sku) => this.reviewService.listReviews(sku))), {
    initialValue: [],
  });

  private readonly recommendations = toSignal(
    this.sku$.pipe(
      switchMap(() =>
        this.recommendationService.listForUser(this.authService.session()?.authenticated ? 'current-user' : null),
      ),
    ),
    { initialValue: [] },
  );

  /** Recommendations aren't sku-scoped, so the product being viewed can appear in its own list — drop it. */
  readonly related = computed(() =>
    this.recommendations().filter((product) => product.sku !== this.product()?.sku),
  );

  selectVariantValue(axis: string, value: string): void {
    const product = this.product();
    if (!product) {
      return;
    }
    const current: Record<string, string> = { ...this.selectedVariant()?.attributes };
    current[axis] = value;
    const match = product.variants.find((variant) =>
      Object.entries(current).every(([key, val]) => variant.attributes[key] === val),
    );
    if (match) {
      this.userSelectedSku.set(match.sku);
    }
  }

  changeQuantity(delta: number): void {
    this.quantity.update((value) => Math.max(1, value + delta));
  }

  addToCart(): void {
    const product = this.product();
    const variant = this.selectedVariant();
    if (!product || !variant) {
      return;
    }
    this.cartService.add(
      {
        sku: variant.sku,
        name: product.name,
        thumbnailUrl: product.thumbnailUrl,
        unitPrice: variant.price,
        maxQuantity: 10,
      },
      this.quantity(),
    );
    this.justAdded.set(true);
    setTimeout(() => this.justAdded.set(false), 2000);
  }

  toggleWishlist(): void {
    const product = this.product();
    if (!product) {
      return;
    }
    this.wishlistService.toggle(product);
  }

  goToCart(): void {
    this.router.navigateByUrl('/cart');
  }
}

import { DOCUMENT, KeyValuePipe, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { Badge, RatingStars, Spinner } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { OfflineQueueService } from '../../../core/offline/offline-queue.service';
import { OnlineStatusService } from '../../../core/offline/online-status.service';
import { SeoService } from '../../../core/seo/seo.service';
import { CartService } from '../../cart/data/cart.service';
import { WishlistService } from '../../wishlist/data/wishlist.service';
import { PromoBadge } from '../../pricing-promotions/promo-badge/promo-badge';
import { PricingService } from '../../pricing-promotions/data/pricing.service';
import { ProductRecommendations } from '../product-recommendations/product-recommendations';
import { ProductReviews } from '../product-reviews/product-reviews';
import { RecentlyViewedRail } from '../recently-viewed-rail/recently-viewed-rail';
import { ProductService } from '../data/product.service';
import { RecentlyViewedService } from '../data/recently-viewed.service';
import { ReviewService } from '../data/review.service';
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

/**
 * WEB-15 — structured data (JSON-LD `Product`) and the hydration-time authoritative re-fetch of
 * price/stock: the SSR-transferred `product` value is trusted for name/images/description, but
 * the instant hydration completes, `variant.price`/`inStock` are re-fetched fresh and swapped
 * in (`afterNextRender`, browser-only) — closing the gap edge-cases.md's "SSR-Rendered
 * Price/Stock Hydration Mismatch" identifies between SSR flush and this app's own real-time
 * connection actually reconnecting.
 *
 * WEB-17/WEB-18 (recommendations, reviews) are deferred child components in the template
 * (`@defer (on viewport)`), not signals here — see their own files for the freshness rationale.
 */
@Component({
  selector: 'kart-product-page',
  imports: [
    RouterLink,
    KeyValuePipe,
    Spinner,
    Badge,
    RatingStars,
    MoneyPipe,
    PromoBadge,
    ProductRecommendations,
    ProductReviews,
    RecentlyViewedRail,
  ],
  templateUrl: './product-page.html',
  styleUrl: './product-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly productService = inject(ProductService);
  private readonly reviewService = inject(ReviewService);
  private readonly pricingService = inject(PricingService);
  private readonly cartService = inject(CartService);
  private readonly onlineStatus = inject(OnlineStatusService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly seo = inject(SeoService);
  private readonly recentlyViewed = inject(RecentlyViewedService);
  protected readonly wishlistService = inject(WishlistService);

  private readonly sku$ = this.route.paramMap.pipe(map((params) => params.get('sku') ?? ''));

  private readonly ssrProduct = toSignal(this.sku$.pipe(switchMap((sku) => this.productService.getBySku(sku))), {
    initialValue: undefined as Product | undefined,
  });

  /** Overlays a hydration-time-fresh price/stock onto the (possibly SSR-transferred) product. */
  private readonly freshVariants = signal<ReadonlyMap<string, ProductVariant> | null>(null);

  readonly product = computed<Product | undefined>(() => {
    const product = this.ssrProduct();
    const fresh = this.freshVariants();
    if (!product || !fresh) {
      return product;
    }
    return { ...product, variants: product.variants.map((variant) => fresh.get(variant.sku) ?? variant) };
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

  constructor() {
    afterNextRender(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      // Re-fetch (not merely re-subscribe) the instant hydration completes — the transferred
      // value's trust is discarded for price/stock specifically (Domain Invariants #2/#4).
      this.productService.getBySku(this.ssrProduct()?.sku ?? '').subscribe((fresh) => {
        if (fresh) {
          this.freshVariants.set(new Map(fresh.variants.map((variant) => [variant.sku, variant])));
        }
      });
    });

    // seo.md §2/§3: populated server-side during the SSR render (this effect runs immediately
    // on construction there too, so the very first response already carries correct tags) —
    // also kept live on subsequent client-side navigations between PDPs so a real visitor's
    // browser tab/title never goes stale, which never substitutes for the SSR'd first response
    // a crawler actually sees.
    effect(() => this.wireSeo(this.ssrProduct()));

    effect(() => {
      const sku = this.ssrProduct()?.sku;
      if (sku && isPlatformBrowser(this.platformId)) {
        void this.recentlyViewed.recordView(sku);
      }
    });
  }

  private wireSeo(product: Product | undefined): void {
    if (!product) {
      return;
    }
    this.seo.setTitle(product.name);
    this.seo.setDescription(product.description);
    const canonicalUrl = `${this.document.location.origin}/p/${product.sku}`;
    this.seo.setCanonicalUrl(canonicalUrl);
    this.seo.setOpenGraph({
      title: product.name,
      description: product.description,
      image: product.images[0],
      type: 'product',
      url: canonicalUrl,
    });
    this.seo.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.images,
      brand: { '@type': 'Brand', name: product.brand },
      offers: {
        '@type': 'Offer',
        price: product.price.amount,
        priceCurrency: product.price.currency,
        availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    });
  }

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
        inStock: variant.inStock,
      },
      this.quantity(),
    );
    if (!this.onlineStatus.isOnline()) {
      this.offlineQueue.enqueueRecheck(variant.sku);
    }
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

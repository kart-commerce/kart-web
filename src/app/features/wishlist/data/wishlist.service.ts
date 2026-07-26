import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { ProductSummary } from '../../catalog/data/models';

const STORAGE_KEY = 'kart-wishlist-v1';

/** Stands in for kart-wishlist-service's `POST/DELETE /wishlist/{sku}` — see mock-catalog.ts's note. */
@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly items = signal<readonly ProductSummary[]>(this.readFromStorage());

  readonly wishlistItems = this.items.asReadonly();
  readonly count = computed(() => this.items().length);

  constructor() {
    effect(() => this.writeToStorage(this.items()));
  }

  has(sku: string): boolean {
    return this.items().some((item) => item.sku === sku);
  }

  toggle(product: ProductSummary): void {
    if (this.has(product.sku)) {
      this.remove(product.sku);
    } else {
      this.add(product);
    }
  }

  add(product: ProductSummary): void {
    this.items.update((current) =>
      current.some((item) => item.sku === product.sku) ? current : [...current, product],
    );
  }

  remove(sku: string): void {
    this.items.update((current) => current.filter((item) => item.sku !== sku));
  }

  private readFromStorage(): readonly ProductSummary[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ProductSummary[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(items: readonly ProductSummary[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

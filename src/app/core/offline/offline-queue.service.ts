import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, effect, inject, signal } from '@angular/core';

import { CartService } from '../../features/cart/data/cart.service';
import { ProductService } from '../../features/catalog/data/product.service';
import { NotificationService } from '../../features/notifications/data/notification.service';
import { OnlineStatusService } from './online-status.service';

interface QueuedRecheck {
  readonly sku: string;
  readonly queuedAt: string;
}

const STORAGE_KEY = 'kart-offline-recheck-queue-v1';

/**
 * WEB-12 — the offline-queue half of PWA support. Only add-to-cart/wishlist are ever queued
 * offline (Domain/UX Invariant #3); this queue doesn't replay the "add" itself (that already
 * happened optimistically and locally the moment it was pressed, per the existing
 * `CartService`/`WishlistService` design) — its job is the edge-cases.md-resolved follow-up:
 * "replay as SKU+quantity only... immediately re-run the existing live re-quote/stock-check on
 * landing, with an explicit toast if the result differs from what the customer saw offline."
 */
@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly onlineStatus = inject(OnlineStatusService);
  private readonly cartService = inject(CartService);
  private readonly productService = inject(ProductService);
  private readonly notificationService = inject(NotificationService);

  private readonly queue = signal<readonly QueuedRecheck[]>(this.readFromStorage());
  private hasReplayedInitialOnlineState = false;

  constructor() {
    effect(() => this.writeToStorage(this.queue()));

    effect(() => {
      const online = this.onlineStatus.isOnline();
      if (online && this.hasReplayedInitialOnlineState) {
        this.replayPending();
      }
      this.hasReplayedInitialOnlineState = true;
    });
  }

  /** Called from an add-to-cart call site when the mutation was made while offline. */
  enqueueRecheck(sku: string): void {
    if (this.queue().some((entry) => entry.sku === sku)) {
      return;
    }
    this.queue.update((current) => [...current, { sku, queuedAt: new Date().toISOString() }]);
  }

  private replayPending(): void {
    const pending = this.queue();
    if (pending.length === 0) {
      return;
    }
    this.queue.set([]);

    for (const entry of pending) {
      const cartLine = this.cartService.cartItems().find((item) => item.sku === entry.sku);
      if (!cartLine) {
        continue;
      }
      this.productService.getBySku(entry.sku).subscribe((product) => {
        const stillInStock = product?.inStock ?? false;
        const priceChanged = product && product.price.amount !== cartLine.unitPrice.amount;

        if (stillInStock !== cartLine.inStock) {
          this.cartService.setAvailability(entry.sku, stillInStock);
        }

        if (!stillInStock) {
          this.notificationService.notify(`${cartLine.name} is now out of stock.`, 'danger');
        } else if (priceChanged) {
          this.notificationService.notify(`${cartLine.name}'s price changed since you added it offline.`, 'info');
        }
      });
    }
  }

  private readFromStorage(): readonly QueuedRecheck[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as QueuedRecheck[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(queue: readonly QueuedRecheck[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}

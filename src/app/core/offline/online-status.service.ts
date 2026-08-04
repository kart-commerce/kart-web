import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

/**
 * Tracks browser connectivity (`navigator.onLine` + `online`/`offline` events) — the one
 * signal Domain/UX Invariant #3 (`requirement-spec.md` §8.3) reads to hard-disable
 * money-moving actions ("place order", "submit payment") with a clear "you're offline"
 * state, never silently queuing them (unlike add-to-cart/wishlist, which `OfflineQueueService`
 * is allowed to queue).
 */
@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly online = signal(this.readInitialStatus());

  readonly isOnline = this.online.asReadonly();

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

  private readInitialStatus(): boolean {
    return isPlatformBrowser(this.platformId) ? navigator.onLine : true;
  }
}

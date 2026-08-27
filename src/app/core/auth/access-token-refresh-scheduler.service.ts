import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, effect, inject } from '@angular/core';

import { AuthService } from './auth.service';
import { RefreshCoordinatorService } from './refresh-coordinator.service';

/**
 * Refreshes the access token shortly *before* it expires, instead of relying solely on a
 * reactive 401 (WEB-9 reliability hardening). Purely reactive refresh has a structural weakness
 * at this app's scale: it only ever fires once a request has already failed, and any page that
 * fires more than one request around the exact expiry moment produces a burst of simultaneous
 * 401s — the exact scenario `RefreshCoordinatorService` and the BFF's distributed lock
 * (`routes.ts`) exist to make *safe*, but which is far better avoided than merely survived.
 * Refreshing proactively means the overwhelmingly common case is one quiet refresh per token
 * lifetime with nothing ever hitting a 401 at all; the reactive interceptor remains as the
 * fallback for whatever this misses (a tab waking from sleep past its scheduled time, clock
 * skew, this call itself failing).
 *
 * Unlike kart-admin-web's equivalent, this isn't gated on an idle-timeout state — kart-web has
 * no idle-session concept (its native session is a long-lived, sliding 90-day window, not a
 * short idle-capped one), so there is no competing policy to preserve here: any authenticated
 * tab keeps its access token fresh for as long as it stays open.
 */
@Injectable({ providedIn: 'root' })
export class AccessTokenRefreshSchedulerService implements OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly refreshCoordinator = inject(RefreshCoordinatorService);
  private readonly platformId = inject(PLATFORM_ID);

  private timer: ReturnType<typeof setTimeout> | null = null;
  private scheduledForExpiresAt: string | null = null;

  constructor() {
    effect(() => {
      const expiresAt = this.authService.session()?.accessTokenExpiresAt ?? null;
      if (expiresAt !== this.scheduledForExpiresAt) {
        this.schedule(expiresAt);
      }
    });
  }

  private schedule(expiresAt: string | null): void {
    this.clear();
    this.scheduledForExpiresAt = expiresAt;

    if (!isPlatformBrowser(this.platformId) || !expiresAt) {
      return;
    }

    const lifetimeMs = new Date(expiresAt).getTime() - Date.now();
    if (lifetimeMs <= 0) {
      // Already expired/expiring (e.g. this tab was asleep) — nothing to schedule ahead of;
      // the reactive interceptor covers this on the next request.
      return;
    }

    // Refresh a bit before expiry: 20% of the remaining lifetime, capped at 60s so a long-lived
    // token doesn't wait an excessive margin, and floored implicitly by lifetimeMs itself so a
    // very short-lived token still schedules something (never negative).
    const bufferMs = Math.min(60_000, lifetimeMs * 0.2);
    const fireInMs = Math.max(lifetimeMs - bufferMs, 0);
    this.timer = setTimeout(() => this.refreshProactively(), fireInMs);
  }

  private refreshProactively(): void {
    this.refreshCoordinator.refresh().subscribe({
      // Swallow failures here deliberately — this is a best-effort head start, not the source of
      // truth. A failed proactive refresh leaves the existing token in place; the reactive 401
      // interceptor (backed by the same coordinator and the BFF's distributed lock) remains the
      // authoritative fallback the moment a real request needs it.
      error: () => undefined,
    });
  }

  private clear(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = null;
  }

  ngOnDestroy(): void {
    this.clear();
  }
}

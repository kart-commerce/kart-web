import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';

export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * WEB-50 — browser push registration, opt-in and permission-gated only: never registered
 * without an explicit customer action (requirement-spec.md §3.6), matching the same
 * never-defaulted-on rule the cookie-consent banner (WEB-11) applies to Analytics/Marketing.
 *
 * `kart-notification-service`'s approved contract has no push/device-token endpoint yet
 * (`paths: {}` — see notification-center.service.ts's note); `registerDeviceToken` below is a
 * stand-in for that future `POST` until it exists.
 */
@Injectable({ providedIn: 'root' })
export class PushRegistrationService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly swPush = inject(SwPush, { optional: true });

  readonly permission = signal<PushPermissionState>(this.readPermission());

  /** Must be called from a real user gesture (a button click) — browsers block a bare-page-load prompt anyway. */
  async requestAndRegister(vapidPublicKey: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || typeof Notification === 'undefined') {
      this.permission.set('unsupported');
      return;
    }

    const result = await Notification.requestPermission();
    this.permission.set(result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'default');

    if (result !== 'granted' || !this.swPush?.isEnabled) {
      return;
    }

    const subscription = await this.swPush.requestSubscription({ serverPublicKey: vapidPublicKey });
    this.registerDeviceToken(subscription);
  }

  private registerDeviceToken(subscription: PushSubscription): void {
    // Stand-in for `POST /v1/notifications/push-registrations` (🚧, no approved endpoint yet).
    void subscription;
  }

  private readPermission(): PushPermissionState {
    if (!isPlatformBrowser(this.platformId) || typeof Notification === 'undefined') {
      return 'unsupported';
    }
    return Notification.permission;
  }
}

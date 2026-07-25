import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject } from '@angular/core';
import { Subject } from 'rxjs';

export type SessionBroadcastMessage = { readonly type: 'login' } | { readonly type: 'logout' };

/**
 * Thin wrapper over `BroadcastChannel('kart-session')` — the local, instant,
 * same-device session-control channel from design-decisions.md's
 * "Cross-Tab State Synchronization — Split by Concern": login/logout in one
 * tab is reflected in every other open tab with no server round-trip. This is
 * deliberately narrow (session-control only) — the broader real-time
 * cart/price/stock sync channel is WEB-10 and out of scope here.
 */
@Injectable({ providedIn: 'root' })
export class SessionBroadcastService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly subject = new Subject<SessionBroadcastMessage>();
  private channel: BroadcastChannel | null = null;

  readonly messages$ = this.subject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId) && typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('kart-session');
      this.channel.onmessage = (event: MessageEvent<SessionBroadcastMessage>) => {
        this.subject.next(event.data);
      };
    }
  }

  post(message: SessionBroadcastMessage): void {
    this.channel?.postMessage(message);
  }

  ngOnDestroy(): void {
    this.channel?.close();
    this.subject.complete();
  }
}

import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { APP_CONFIG } from '../config/app-config';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface InboundEnvelope {
  readonly channel: string;
  readonly data: unknown;
}

const MAX_BACKOFF_MS = 30_000;
const INITIAL_BACKOFF_MS = 1000;

/**
 * WEB-10 — one WS connection per session, multiplexing channel subscriptions (architecture.md's
 * "one connection manager, not one per feature" rule): cart-sync, live inventory/price, and
 * order/delivery status all share this single socket rather than each feature opening its own.
 *
 * A dropped connection degrades to the last-cached value plus a visible reconnecting state
 * (exponential backoff, capped) — it never blocks checkout, which always falls back to a
 * synchronous re-quote regardless of channel health (Domain Invariant #2). Consumers that need
 * a fallback when this channel is unavailable (e.g. order-tracking's poll, WEB-39) keep their
 * own polling regardless of this manager's connection state — this manager is a real-time
 * *enhancement*, never the sole source of truth.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeConnectionManager implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly appConfig = inject(APP_CONFIG);

  private socket: WebSocket | null = null;
  private reconnectHandle: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = INITIAL_BACKOFF_MS;
  private readonly channelSubjects = new Map<string, Subject<unknown>>();
  private readonly subscribedChannels = new Set<string>();
  private destroyed = false;

  readonly status = signal<ConnectionStatus>('disconnected');

  /** Overridable in tests — production code always uses the real `WebSocket` constructor. */
  webSocketFactory: (url: string) => WebSocket = (url) => new WebSocket(url);

  connect(): void {
    if (!isPlatformBrowser(this.platformId) || this.socket || this.destroyed) {
      return;
    }
    this.status.set(this.backoffMs === INITIAL_BACKOFF_MS ? 'connecting' : 'reconnecting');

    try {
      this.socket = this.webSocketFactory(this.realtimeUrl());
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket.addEventListener('open', () => {
      this.status.set('connected');
      this.backoffMs = INITIAL_BACKOFF_MS;
      for (const channel of this.subscribedChannels) {
        this.sendSubscribe(channel);
      }
    });

    this.socket.addEventListener('message', (event: MessageEvent) => {
      this.handleMessage(event.data as string);
    });

    this.socket.addEventListener('close', () => this.handleDisconnect());
    this.socket.addEventListener('error', () => this.handleDisconnect());
  }

  /** Subscribes to one multiplexed channel — cart-sync, product-price/stock, order-status, etc. */
  subscribe<T = unknown>(channel: string): Observable<T> {
    this.subscribedChannels.add(channel);
    if (this.status() === 'connected') {
      this.sendSubscribe(channel);
    } else {
      this.connect();
    }
    return this.channelSubject(channel) as unknown as Observable<T>;
  }

  unsubscribe(channel: string): void {
    this.subscribedChannels.delete(channel);
    this.channelSubjects.get(channel)?.complete();
    this.channelSubjects.delete(channel);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    if (this.reconnectHandle) {
      clearTimeout(this.reconnectHandle);
    }
    this.socket?.close();
    for (const subject of this.channelSubjects.values()) {
      subject.complete();
    }
  }

  private handleDisconnect(): void {
    this.socket = null;
    if (this.destroyed) {
      return;
    }
    this.status.set('disconnected');
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectHandle) {
      return;
    }
    this.reconnectHandle = setTimeout(() => {
      this.reconnectHandle = null;
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      this.connect();
    }, this.backoffMs);
  }

  private handleMessage(raw: string): void {
    let envelope: InboundEnvelope;
    try {
      envelope = JSON.parse(raw) as InboundEnvelope;
    } catch {
      return;
    }
    this.channelSubject(envelope.channel).next(envelope.data);
  }

  private sendSubscribe(channel: string): void {
    this.socket?.send(JSON.stringify({ type: 'subscribe', channel }));
  }

  private channelSubject(channel: string): Subject<unknown> {
    let subject = this.channelSubjects.get(channel);
    if (!subject) {
      subject = new Subject<unknown>();
      this.channelSubjects.set(channel, subject);
    }
    return subject;
  }

  private realtimeUrl(): string {
    const httpUrl = this.appConfig.gatewayBaseUrl;
    const wsUrl = httpUrl.replace(/^http/, 'ws');
    return `${wsUrl}/v1/realtime`;
  }
}

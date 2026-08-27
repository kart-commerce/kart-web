import { isPlatformBrowser } from '@angular/common';
import { Injectable, OnDestroy, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AppNotification, NotificationKind } from './models';

const STORAGE_KEY = 'kart-notification-center-v1';
const POLL_INTERVAL_MS = 30_000;

/**
 * WEB-49 — persisted in-app notification center (list/mark-read).
 *
 * `kart-notification-service`'s approved `api-contract.yaml` currently declares no
 * customer-facing paths at all (`paths: {}` — it is event-consumer-only today,
 * confirmed against the vendored contract in `contracts/kart-notification-service.api-contract.yaml`).
 * This is a genuine backend gap beyond the four WEB-XT tickets this design package already
 * names — flagged here and in the delivery report, not silently treated as done — so
 * `list()`/`poll()` below are localStorage-backed stand-ins for the eventual
 * `GET /v1/notifications` + `PATCH /v1/notifications/{id}/read` pair, structured so swapping
 * them for the generated client (once that contract exists) only touches this file.
 *
 * Real-time push (the `Real-Time Channels` table's "In-app notifications" row) needs WEB-10's
 * connection manager; `poll()` is the documented fallback and is what this mock exercises today.
 */
@Injectable({ providedIn: 'root' })
export class NotificationCenterService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  private readonly items = signal<readonly AppNotification[]>(this.readFromStorage());

  readonly notifications = computed(() =>
    [...this.items()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

  constructor() {
    effect(() => this.writeToStorage(this.items()));

    if (isPlatformBrowser(this.platformId)) {
      this.pollHandle = setInterval(() => this.poll().subscribe(), POLL_INTERVAL_MS);
    }
  }

  ngOnDestroy(): void {
    if (this.pollHandle) {
      clearInterval(this.pollHandle);
    }
  }

  push(kind: NotificationKind, title: string, message: string, link?: string): void {
    const notification: AppNotification = {
      id: crypto.randomUUID(),
      kind,
      title,
      message,
      link,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.items.update((current) => [notification, ...current].slice(0, 100));
  }

  markRead(id: string): void {
    this.items.update((current) => current.map((item) => (item.id === id ? { ...item, read: true } : item)));
  }

  markAllRead(): void {
    this.items.update((current) => current.map((item) => ({ ...item, read: true })));
  }

  /** Poll-fallback re-fetch — a no-op today (no backend list endpoint exists yet), kept as the wiring point for when one lands. */
  private poll(): Observable<void> {
    if (!this.authService.session()?.authenticated) {
      return of(undefined);
    }
    return of(undefined);
  }

  private readFromStorage(): readonly AppNotification[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AppNotification[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(items: readonly AppNotification[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

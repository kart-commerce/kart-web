import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'info' | 'danger';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly variant: ToastVariant;
}

const AUTO_DISMISS_MS = 3000;

/**
 * In-app toast surface. kart-notification-service (email/SMS/push) is event-consumer only — no
 * direct frontend endpoint (see architecture.md's frontend-module table) — so this is the one
 * piece of "notifications" the browser itself is responsible for: brief on-screen confirmation
 * for actions like "added to cart" or "coupon applied".
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly toasts = signal<readonly Toast[]>([]);

  readonly activeToasts = this.toasts.asReadonly();

  notify(message: string, variant: ToastVariant = 'success'): void {
    const toast: Toast = { id: crypto.randomUUID(), message, variant };
    this.toasts.update((current) => [...current, toast]);
    setTimeout(() => this.dismiss(toast.id), AUTO_DISMISS_MS);
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}

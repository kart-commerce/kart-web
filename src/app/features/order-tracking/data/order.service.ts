import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { Money } from '../../../shared/util/money';
import { Address } from '../../checkout/data/models';
import { Order, OrderLineItem } from './models';

const STORAGE_KEY = 'kart-orders-v1';

export interface PlaceOrderInput {
  readonly items: readonly OrderLineItem[];
  readonly shippingAddress: Address;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
}

function generateTrackingId(): string {
  return `KT${Math.floor(100000000 + Math.random() * 900000000)}`;
}

/**
 * Stands in for kart-order-service's `POST /orders` and `GET /orders/{id}` (see mock-catalog.ts's
 * note), plus a mock kart-shipping-service tracking id assigned at order-confirmation time.
 * `placeOrder` is keyed by the caller-supplied Idempotency-Key exactly like the real contract
 * requires — a retried submit with the same key returns the original order instead of creating
 * a duplicate.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly idempotencyIndex = new Map<string, string>();

  private readonly orders = signal<readonly Order[]>(this.readFromStorage());

  placeOrder(input: PlaceOrderInput, idempotencyKey: string): Observable<Order> {
    const existingOrderId = this.idempotencyIndex.get(idempotencyKey);
    if (existingOrderId) {
      const existing = this.orders().find((order) => order.orderId === existingOrderId);
      if (existing) {
        return of(existing);
      }
    }

    const placedAt = new Date().toISOString();
    const order: Order = {
      orderId: crypto.randomUUID(),
      placedAt,
      status: 'confirmed',
      statusHistory: [{ status: 'confirmed', at: placedAt }],
      items: input.items,
      shippingAddress: input.shippingAddress,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      trackingId: generateTrackingId(),
    };

    this.idempotencyIndex.set(idempotencyKey, order.orderId);
    this.orders.update((current) => [order, ...current]);
    this.writeToStorage(this.orders());

    return of(order);
  }

  getById(orderId: string): Observable<Order | undefined> {
    return of(this.orders().find((order) => order.orderId === orderId));
  }

  listForUser(): Observable<readonly Order[]> {
    return of(this.orders());
  }

  private readFromStorage(): readonly Order[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Order[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(orders: readonly Order[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }
}

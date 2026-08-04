import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { Money, addMoney } from '../../../shared/util/money';
import { Address } from '../../checkout/data/models';
import {
  Order,
  OrderLineItem,
  ReturnReasonCode,
  ReturnRequestLineSelection,
  ShippingMethodSummary,
} from './models';

const STORAGE_KEY = 'kart-orders-v1';

/** checkout-and-refunds.md §B.4 auto-approval fast path threshold (USD-equivalent). */
const AUTO_APPROVAL_MAX_AMOUNT = 200;
/** Demo-only status auto-progression cadence — nothing in a real deployment schedules this client-side. */
const MOCK_STATUS_ADVANCE_MS = 8000;

export interface PlaceOrderInput {
  readonly items: readonly OrderLineItem[];
  readonly shippingAddress: Address;
  readonly shippingMethod?: ShippingMethodSummary;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
}

export interface SubmitReturnRequestInput {
  readonly reasonCode: ReturnReasonCode;
  readonly note?: string;
  readonly lineSelections: readonly ReturnRequestLineSelection[];
}

export class ReturnRequestConflictError extends Error {
  constructor(readonly code: 'disputed_conflict' | 'not_eligible') {
    super(
      code === 'disputed_conflict'
        ? 'This order has an active dispute — contact Support.'
        : 'This order is not eligible for a return request.',
    );
  }
}

function generateTrackingId(): string {
  return `KT${Math.floor(100000000 + Math.random() * 900000000)}`;
}

const MOCK_CARRIERS = ['Kart Express', 'Northline Logistics', 'Summit Freight'];

/**
 * Stands in for kart-order-service's `POST /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel`,
 * and the new `POST /orders/{id}/return-request` (🚧, WEB-XT-1 — see feature-flags.ts) — plus a
 * mock kart-shipping-service tracking id/carrier assigned at order-confirmation/ship time.
 * `placeOrder`/`cancelOrder`/`submitReturnRequest` are all keyed by the caller-supplied
 * Idempotency-Key exactly like the real contracts require.
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
      shippingMethod: input.shippingMethod,
      subtotal: input.subtotal,
      discount: input.discount,
      total: input.total,
      trackingId: generateTrackingId(),
    };

    this.idempotencyIndex.set(idempotencyKey, order.orderId);
    this.orders.update((current) => [order, ...current]);
    this.writeToStorage(this.orders());
    this.scheduleStatusProgression(order.orderId);

    return of(order);
  }

  getById(orderId: string): Observable<Order | undefined> {
    return of(this.orders().find((order) => order.orderId === orderId));
  }

  listForUser(): Observable<readonly Order[]> {
    return of(this.orders());
  }

  /** WEB-38 — a disabled control, not an expected-to-fail call; still idempotent/defensive server-side. */
  cancelOrder(orderId: string, idempotencyKey: string): Observable<Order> {
    const order = this.orders().find((candidate) => candidate.orderId === orderId);
    if (!order) {
      return throwError(() => new Error('Order not found.'));
    }
    if (order.status === 'cancelled') {
      return of(order);
    }
    if (order.status !== 'confirmed' && order.status !== 'processing') {
      return throwError(() => new Error('This order can no longer be cancelled.'));
    }

    const updated: Order = {
      ...order,
      status: 'cancelled',
      statusHistory: [...order.statusHistory, { status: 'cancelled', at: new Date().toISOString() }],
    };
    this.replaceOrder(updated);
    this.idempotencyIndex.set(idempotencyKey, orderId);
    return of(updated);
  }

  /**
   * WEB-35/36 — customer-initiated return/refund request. `🚧` behind `ff-return-request-order-service`
   * (feature-flags.ts) until kart-order-service's real `ReturnRequest` sub-resource lands
   * (WEB-XT-1) — this mock reproduces checkout-and-refunds.md §B.2-B.4's eligibility/auto-approval
   * rule and §B.9's fresh-state chargeback-precedence check exactly, so the UI built against it
   * doesn't need to change shape once the real endpoint exists.
   */
  submitReturnRequest(orderId: string, input: SubmitReturnRequestInput, idempotencyKey: string): Observable<Order> {
    const existingOrderId = this.idempotencyIndex.get(idempotencyKey);
    if (existingOrderId) {
      const existing = this.orders().find((order) => order.orderId === existingOrderId);
      if (existing) {
        return of(existing);
      }
    }

    const order = this.orders().find((candidate) => candidate.orderId === orderId);
    if (!order) {
      return throwError(() => new Error('Order not found.'));
    }
    // §B.9 fresh-state check: a chargeback always wins over a customer-initiated return.
    if (order.disputed || order.status === 'refunded') {
      return throwError(() => new ReturnRequestConflictError('disputed_conflict'));
    }
    if (order.status !== 'delivered' || order.returnRequest) {
      return throwError(() => new ReturnRequestConflictError('not_eligible'));
    }

    const requestedAmount = input.lineSelections.reduce(
      (sum, selection) => {
        const line = order.items.find((item) => item.sku === selection.sku);
        if (!line) {
          return sum;
        }
        return addMoney(sum, { amount: line.unitPrice.amount * selection.quantity, currency: line.unitPrice.currency });
      },
      { amount: 0, currency: order.total.currency },
    );

    const autoApproved = requestedAmount.amount <= AUTO_APPROVAL_MAX_AMOUNT;
    const requestedAt = new Date().toISOString();

    const updated: Order = {
      ...order,
      returnRequest: {
        id: crypto.randomUUID(),
        status: autoApproved ? 'approved' : 'requested',
        reasonCode: input.reasonCode,
        note: input.note,
        lineSelections: input.lineSelections,
        requestedAmount,
        requestedAt,
      },
    };
    this.replaceOrder(updated);
    this.idempotencyIndex.set(idempotencyKey, orderId);

    if (autoApproved && isPlatformBrowser(this.platformId)) {
      setTimeout(() => this.finalizeAutoApprovedRefund(orderId), 2000);
    }

    return of(updated);
  }

  private finalizeAutoApprovedRefund(orderId: string): void {
    const order = this.orders().find((candidate) => candidate.orderId === orderId);
    if (!order?.returnRequest || order.returnRequest.status !== 'approved') {
      return;
    }
    this.replaceOrder({
      ...order,
      status: 'refunded',
      statusHistory: [...order.statusHistory, { status: 'refunded', at: new Date().toISOString() }],
      returnRequest: { ...order.returnRequest, status: 'refund-issued' },
    });
  }

  private scheduleStatusProgression(orderId: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const remainingSteps: Order['status'][] = ['processing', 'shipped', 'out-for-delivery', 'delivered'];
    const advance = (index: number) => {
      setTimeout(() => {
        const order = this.orders().find((candidate) => candidate.orderId === orderId);
        // Never advance past a cancellation/refund/exception the customer or backend already applied.
        if (!order || order.status === 'cancelled' || order.status === 'refunded') {
          return;
        }
        const nextStatus = remainingSteps[index];
        const carrier =
          nextStatus === 'shipped'
            ? {
                carrier: MOCK_CARRIERS[Math.floor(Math.random() * MOCK_CARRIERS.length)],
                estimatedDeliveryAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              }
            : order.carrier;
        this.replaceOrder({
          ...order,
          status: nextStatus,
          statusHistory: [...order.statusHistory, { status: nextStatus, at: new Date().toISOString() }],
          carrier,
        });
        if (index + 1 < remainingSteps.length) {
          advance(index + 1);
        }
      }, MOCK_STATUS_ADVANCE_MS);
    };
    advance(0);
  }

  private replaceOrder(updated: Order): void {
    this.orders.update((current) => current.map((order) => (order.orderId === updated.orderId ? updated : order)));
    this.writeToStorage(this.orders());
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

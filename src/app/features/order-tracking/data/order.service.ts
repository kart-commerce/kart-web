import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { DefaultService as OrderApi } from '../../../core/http/generated/order/v1';
import { CreateOrderRequest } from '../../../core/http/generated/order/v1/model/createOrderRequest';
import { OrderView } from '../../../core/http/generated/order/v1/model/orderView';
import { Money, addMoney } from '../../../shared/util/money';
import { Address } from '../../checkout/data/models';
import {
  Order,
  OrderLineItem,
  OrderStatus,
  ReturnReasonCode,
  ReturnRequestLineSelection,
  ShippingMethodSummary,
} from './models';

/** kart-order-service's own vendored OpenAPI contract predates the `gatewayToken` field. */
interface CreateOrderRequestWithToken extends CreateOrderRequest {
  readonly gatewayToken: string;
}

function mapRealStatus(status: OrderView.StatusEnum): OrderStatus {
  switch (status) {
    case 'Created':
    case 'Reserved':
      return 'processing';
    case 'Paid':
      return 'confirmed';
    case 'Shipped':
      return 'shipped';
    case 'Delivered':
      return 'delivered';
    case 'Cancelled':
      return 'cancelled';
    case 'Refunded':
      return 'refunded';
    case 'FulfillmentException':
      return 'fulfillment-exception';
    default:
      return 'processing';
  }
}

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
  readonly currency: string;
  /** From `PaymentTokenizationField`'s isolated-frame tokenizer — threads through to kart-order-service's `OrderCreated` payload so kart-payment-service's async charge trigger knows which payment method to charge. */
  readonly gatewayToken: string;
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
 * `placeOrder` calls the real kart-order-service `POST /v1/orders` — genuinely synchronous
 * per-line Inventory reservation happens before it returns (ORD-1). Payment then clears
 * asynchronously (order-service's own saga), so the status this app displays right after placing
 * an order is `processing` (real status `Created`/`Reserved`), not `confirmed` — `getById`
 * re-fetches the real order to pick up `Paid`→`confirmed` once payment clears.
 *
 * kart-order-service's own `CreateOrder` contract has no `shippingMethod`/discount field — this
 * app keeps those (plus a mock shipping tracking id, since kart-shipping-service is an empty,
 * unscaffolded repo) in this local display cache only, seeded from what the checkout UI already
 * computed, alongside the real, backend-verified `orderId`/`status`. A real fix (adding those
 * fields to Order's own contract) is new-feature design work, not a gap-fill — see the flow's
 * known-limitations note.
 *
 * `cancelOrder`/`submitReturnRequest` remain fully local/mocked — Order Management (Admin, flow
 * #7) and Returns/Refunds (flow #9) are each their own dedicated build, out of scope here.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly orderApi = inject(OrderApi);
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

    const userId = this.authService.session()?.userId;
    if (!userId) {
      // kart-order-service's CreateOrder contract requires a non-null userId — there is no
      // anonymous/guest order path on the real backend (a real, pre-existing gap; the catalog's
      // "Guest" checkout branch is unsupported server-side, not something fixed this session).
      return throwError(() => new Error('Placing a real order requires an authenticated session.'));
    }

    const request: CreateOrderRequestWithToken = {
      userId,
      currency: input.currency,
      gatewayToken: input.gatewayToken,
      items: input.items.map((item) => ({ sku: item.sku, qty: item.quantity, unitPrice: item.unitPrice })),
    };

    return this.orderApi.createOrder(idempotencyKey, request).pipe(
      map((view: OrderView) => {
        const placedAt = view.createdAt;
        const order: Order = {
          orderId: view.orderId,
          placedAt,
          status: mapRealStatus(view.status),
          statusHistory: [{ status: mapRealStatus(view.status), at: placedAt }],
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
        return order;
      }),
    );
  }

  /** Re-fetches the real order's current status (e.g. `Paid` once payment clears) and merges it onto the local display cache. */
  refreshStatus(orderId: string): Observable<Order | undefined> {
    return this.orderApi.getOrder(orderId).pipe(
      map((view) => {
        const existing = this.orders().find((order) => order.orderId === orderId);
        if (!existing) {
          return undefined;
        }
        const status = mapRealStatus(view.status);
        const updated: Order = {
          ...existing,
          status,
          statusHistory:
            existing.statusHistory.at(-1)?.status === status
              ? existing.statusHistory
              : [...existing.statusHistory, { status, at: new Date().toISOString() }],
        };
        this.replaceOrder(updated);
        return updated;
      }),
      catchError(() => of(undefined)),
    );
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

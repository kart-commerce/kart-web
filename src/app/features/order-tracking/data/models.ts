import { Money } from '../../../shared/util/money';
import { Address } from '../../checkout/data/models';

/**
 * checkout-and-refunds.md Part C's state machine, flattened onto this app's simplified
 * `Created/Reserved/Paid` → `confirmed`/`processing` mapping: `cancelled`/`refunded`/
 * `fulfillment-exception` are the terminal/exception states that summary table's action-surface
 * rules key off of.
 */
export type OrderStatus =
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'fulfillment-exception';

export const ORDER_STATUS_SEQUENCE: readonly OrderStatus[] = [
  'confirmed',
  'processing',
  'shipped',
  'out-for-delivery',
  'delivered',
];

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  confirmed: 'Order confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  'out-for-delivery': 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  'fulfillment-exception': 'Needs attention',
};

export interface OrderStatusEvent {
  readonly status: OrderStatus;
  readonly at: string;
}

export interface OrderLineItem {
  readonly sku: string;
  readonly name: string;
  readonly thumbnailUrl: string;
  readonly unitPrice: Money;
  readonly quantity: number;
}

export interface ShippingMethodSummary {
  readonly label: string;
  readonly etaDays: string;
}

/** kart-shipping-service/kart-delivery-tracking-service projection — carrier + ETA, real-time-pushed or polled (WEB-39). */
export interface CarrierTrackingInfo {
  readonly carrier: string;
  readonly estimatedDeliveryAt?: string;
}

export type ReturnReasonCode =
  | 'damaged-defective'
  | 'not-as-described'
  | 'no-longer-needed'
  | 'wrong-item-shipped'
  | 'other';

export const RETURN_REASON_LABELS: Readonly<Record<ReturnReasonCode, string>> = {
  'damaged-defective': 'Damaged or defective',
  'not-as-described': 'Not as described',
  'no-longer-needed': 'No longer needed',
  'wrong-item-shipped': 'Wrong item shipped',
  other: 'Other',
};

export type ReturnRequestStatus = 'requested' | 'approved' | 'rejected' | 'refund-issued';

export interface ReturnRequestLineSelection {
  readonly sku: string;
  readonly quantity: number;
}

/** checkout-and-refunds.md §B — a child record on the Order aggregate, never a separate top-level resource. */
export interface ReturnRequest {
  readonly id: string;
  readonly status: ReturnRequestStatus;
  readonly reasonCode: ReturnReasonCode;
  readonly note?: string;
  readonly lineSelections: readonly ReturnRequestLineSelection[];
  readonly requestedAmount: Money;
  readonly requestedAt: string;
  readonly rejectionReason?: string;
}

/** `GET /orders/{id}` projection, joined client-side with kart-delivery-tracking-service's tracking id. */
export interface Order {
  readonly orderId: string;
  readonly placedAt: string;
  readonly status: OrderStatus;
  readonly statusHistory: readonly OrderStatusEvent[];
  readonly items: readonly OrderLineItem[];
  readonly shippingAddress: Address;
  readonly shippingMethod?: ShippingMethodSummary;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
  readonly trackingId: string;
  readonly carrier?: CarrierTrackingInfo;
  readonly returnRequest?: ReturnRequest | null;
  /** A card-network chargeback landed against this order — takes precedence over any customer-initiated return (edge-cases.md, chargeback-vs-auto-approval precedence). */
  readonly disputed?: boolean;
}

const RETURN_WINDOW_DAYS = 30;

/** checkout-and-refunds.md Part C summary table — the one place the state-aware action surface is decided. */
export type OrderAction = 'cancel' | 'request-return';

export function availableOrderActions(order: Order): ReadonlySet<OrderAction> {
  if (order.status === 'confirmed' || order.status === 'processing') {
    return new Set(['cancel']);
  }
  if (order.status === 'delivered' && !order.returnRequest && isWithinReturnWindow(order)) {
    return new Set(['request-return']);
  }
  return new Set();
}

export function isWithinReturnWindow(order: Order, now = Date.now()): boolean {
  const deliveredEvent = order.statusHistory.find((event) => event.status === 'delivered');
  if (!deliveredEvent) {
    return false;
  }
  const elapsedMs = now - new Date(deliveredEvent.at).getTime();
  return elapsedMs <= RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/** Short, human-friendly order number for display — `orderId` itself stays the full UUID used for routing/lookup. */
export function formatOrderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

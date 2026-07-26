import { Money } from '../../../shared/util/money';
import { Address } from '../../checkout/data/models';

export type OrderStatus = 'confirmed' | 'processing' | 'shipped' | 'out-for-delivery' | 'delivered';

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

/** `GET /orders/{id}` projection, joined client-side with kart-delivery-tracking-service's tracking id. */
export interface Order {
  readonly orderId: string;
  readonly placedAt: string;
  readonly status: OrderStatus;
  readonly statusHistory: readonly OrderStatusEvent[];
  readonly items: readonly OrderLineItem[];
  readonly shippingAddress: Address;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
  readonly trackingId: string;
}

/** Short, human-friendly order number for display — `orderId` itself stays the full UUID used for routing/lookup. */
export function formatOrderNumber(orderId: string): string {
  return `#${orderId.slice(0, 8).toUpperCase()}`;
}

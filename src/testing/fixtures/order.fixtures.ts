import { OrderView } from '../../app/core/http/generated/order/v1/model/orderView';

export const FIXTURE_ORDERS: readonly OrderView[] = [
  {
    orderId: 'ord-fixture-001',
    userId: 'usr-fixture-001',
    status: 'Shipped',
    items: [{ sku: 'PHN-AURA-256-BLK', qty: 1, unitPrice: { amount: 999, currency: 'USD' } }],
    totalAmount: { amount: 999, currency: 'USD' },
    createdAt: '2026-07-20T14:00:00.000Z',
  },
  {
    orderId: 'ord-fixture-002',
    userId: 'usr-fixture-001',
    status: 'Delivered',
    items: [{ sku: 'AUD-PULSE-BUD-WHT', qty: 2, unitPrice: { amount: 179, currency: 'USD' } }],
    totalAmount: { amount: 358, currency: 'USD' },
    createdAt: '2026-06-15T09:30:00.000Z',
  },
];

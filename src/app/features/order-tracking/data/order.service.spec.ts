import { TestBed } from '@angular/core/testing';

import { Address } from '../../checkout/data/models';
import { Order, availableOrderActions } from './models';
import { OrderService, PlaceOrderInput, ReturnRequestConflictError } from './order.service';

function address(): Address {
  return {
    addressId: 'addr-1',
    fullName: 'Jordan Rivera',
    line1: '1 Market St',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
    phone: '555-0100',
    isDefault: true,
  };
}

function input(): PlaceOrderInput {
  return {
    items: [
      {
        sku: 'A',
        name: 'Test product',
        thumbnailUrl: '',
        unitPrice: { amount: 10, currency: 'USD' },
        quantity: 1,
      },
    ],
    shippingAddress: address(),
    subtotal: { amount: 10, currency: 'USD' },
    discount: { amount: 0, currency: 'USD' },
    total: { amount: 10, currency: 'USD' },
  };
}

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrderService);
  });

  it('creates a confirmed order with a tracking id', () => {
    let order: Order | undefined;
    service.placeOrder(input(), 'key-1').subscribe((result) => (order = result));

    expect(order?.status).toBe('confirmed');
    expect(order?.trackingId).toBeTruthy();
    expect(order?.statusHistory.length).toBe(1);
  });

  it('returns the same order for a retried idempotency key instead of creating a duplicate', () => {
    let first: Order | undefined;
    let second: Order | undefined;

    service.placeOrder(input(), 'retry-key').subscribe((result) => (first = result));
    service.placeOrder(input(), 'retry-key').subscribe((result) => (second = result));

    expect(second?.orderId).toBe(first?.orderId);
    let orders: readonly Order[] = [];
    service.listForUser().subscribe((result) => (orders = result));
    expect(orders.length).toBe(1);
  });

  it('creates separate orders for distinct idempotency keys', () => {
    service.placeOrder(input(), 'key-a').subscribe();
    service.placeOrder(input(), 'key-b').subscribe();

    let orders: readonly Order[] = [];
    service.listForUser().subscribe((result) => (orders = result));
    expect(orders.length).toBe(2);
  });

  it('finds a placed order by id', () => {
    let placedId = '';
    service.placeOrder(input(), 'key-lookup').subscribe((result) => (placedId = result.orderId));

    let found: Order | undefined;
    service.getById(placedId).subscribe((result) => (found = result));

    expect(found?.orderId).toBe(placedId);
  });

  it('cancels a confirmed order and stamps a cancelled status-history event', () => {
    let placed!: Order;
    service.placeOrder(input(), 'key-cancel').subscribe((result) => (placed = result));

    let cancelled: Order | undefined;
    service.cancelOrder(placed.orderId, 'cancel-key-1').subscribe((result) => (cancelled = result));

    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.statusHistory.at(-1)?.status).toBe('cancelled');
    expect(availableOrderActions(cancelled!).size).toBe(0);
  });

  it('cancelling an already-cancelled order is idempotent, not an error', () => {
    let placed!: Order;
    service.placeOrder(input(), 'key-cancel-2').subscribe((result) => (placed = result));
    service.cancelOrder(placed.orderId, 'cancel-key-2').subscribe();

    let secondAttempt: Order | undefined;
    service.cancelOrder(placed.orderId, 'cancel-key-3').subscribe((result) => (secondAttempt = result));

    expect(secondAttempt?.status).toBe('cancelled');
  });

  it('only exposes the cancel action while confirmed/processing, per checkout-and-refunds.md Part C', () => {
    let placed!: Order;
    service.placeOrder(input(), 'key-actions').subscribe((result) => (placed = result));

    expect(availableOrderActions(placed).has('cancel')).toBeTrue();
    expect(availableOrderActions({ ...placed, status: 'shipped' }).size).toBe(0);
  });

  it('auto-approves a return request within the $200 threshold from a delivered order', () => {
    const deliveredOrder: Order = {
      ...input(),
      orderId: 'order-1',
      placedAt: new Date().toISOString(),
      status: 'delivered',
      statusHistory: [{ status: 'delivered', at: new Date().toISOString() }],
      trackingId: 'KT1',
    };
    (service as unknown as { orders: { set: (v: readonly Order[]) => void } })['orders'].set([deliveredOrder]);

    let result: Order | undefined;
    service
      .submitReturnRequest(
        'order-1',
        { reasonCode: 'no-longer-needed', lineSelections: [{ sku: 'A', quantity: 1 }] },
        'return-key-1',
      )
      .subscribe((order) => (result = order));

    expect(result?.returnRequest?.status).toBe('approved');
    expect(result?.returnRequest?.requestedAmount).toEqual({ amount: 10, currency: 'USD' });
  });

  it('rejects a return request with a disputed_conflict error when the order has a chargeback', () => {
    const disputedOrder: Order = {
      ...input(),
      orderId: 'order-2',
      placedAt: new Date().toISOString(),
      status: 'delivered',
      statusHistory: [{ status: 'delivered', at: new Date().toISOString() }],
      trackingId: 'KT2',
      disputed: true,
    };
    (service as unknown as { orders: { set: (v: readonly Order[]) => void } })['orders'].set([disputedOrder]);

    let error: unknown;
    service
      .submitReturnRequest('order-2', { reasonCode: 'other', lineSelections: [{ sku: 'A', quantity: 1 }] }, 'return-key-2')
      .subscribe({ error: (err) => (error = err) });

    expect(error).toBeInstanceOf(ReturnRequestConflictError);
    expect((error as ReturnRequestConflictError).code).toBe('disputed_conflict');
  });
});

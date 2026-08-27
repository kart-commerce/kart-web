import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from '../../../core/auth/auth.service';
import { OrderView } from '../../../core/http/generated/order/v1/model/orderView';
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
    currency: 'USD',
    gatewayToken: 'tok_test_visa',
  };
}

function orderView(orderId: string, status: OrderView.StatusEnum = 'Created'): OrderView {
  return {
    orderId,
    userId: 'user-1',
    status,
    items: [{ sku: 'A', qty: 1, unitPrice: { amount: 10, currency: 'USD' } }],
    totalAmount: { amount: 10, currency: 'USD' },
    createdAt: new Date().toISOString(),
  };
}

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(AuthService).session.set({ authenticated: true, roles: ['customer'], userId: 'user-1' });
    httpMock = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OrderService);
  });

  afterEach(() => httpMock.verify());

  function placeOrder(idempotencyKey: string, orderId: string, status: OrderView.StatusEnum = 'Created') {
    let result: Order | undefined;
    service.placeOrder(input(), idempotencyKey).subscribe((order) => (result = order));
    const req = httpMock.expectOne((r) => r.method === 'POST' && r.url.includes('/orders'));
    expect(req.request.body.gatewayToken).toBe('tok_test_visa');
    expect(req.request.body.userId).toBe('user-1');
    req.flush(orderView(orderId, status));
    return result!;
  }

  it('creates an order against the real backend and maps its status to this app\'s own vocabulary', () => {
    const order = placeOrder('key-1', 'order-1', 'Created');

    expect(order.status).toBe('processing');
    expect(order.trackingId).toBeTruthy();
    expect(order.statusHistory.length).toBe(1);
  });

  it('maps a real Paid status to this app\'s confirmed status', () => {
    const order = placeOrder('key-paid', 'order-paid', 'Paid');
    expect(order.status).toBe('confirmed');
  });

  it('returns the same locally-cached order for a retried idempotency key instead of calling the backend again', () => {
    const first = placeOrder('retry-key', 'order-retry');

    let second: Order | undefined;
    service.placeOrder(input(), 'retry-key').subscribe((result) => (second = result));

    expect(second?.orderId).toBe(first.orderId);
    let orders: readonly Order[] = [];
    service.listForUser().subscribe((result) => (orders = result));
    expect(orders.length).toBe(1);
  });

  it('rejects placing an order without an authenticated session (no guest checkout on the real backend)', () => {
    TestBed.inject(AuthService).session.set({ authenticated: false, roles: [] });

    let error: unknown;
    service.placeOrder(input(), 'key-guest').subscribe({ error: (err) => (error = err) });

    expect(error).toBeInstanceOf(Error);
  });

  it('cancels a confirmed order and stamps a cancelled status-history event', () => {
    const placed = placeOrder('key-cancel', 'order-cancel');

    let cancelled: Order | undefined;
    service.cancelOrder(placed.orderId, 'cancel-key-1').subscribe((result) => (cancelled = result));

    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled?.statusHistory.at(-1)?.status).toBe('cancelled');
    expect(availableOrderActions(cancelled!).size).toBe(0);
  });

  it('only exposes the cancel action while confirmed/processing, per checkout-and-refunds.md Part C', () => {
    const placed = placeOrder('key-actions', 'order-actions');

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

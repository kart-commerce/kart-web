import { TestBed } from '@angular/core/testing';

import { Address } from '../../checkout/data/models';
import { Order } from './models';
import { OrderService, PlaceOrderInput } from './order.service';

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
});

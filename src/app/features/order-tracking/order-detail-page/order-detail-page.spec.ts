import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../../../core/config/app-config';
import { FeatureFlagsStore } from '../../../core/config/feature-flags.store';
import { RealtimeConnectionManager } from '../../../core/realtime/realtime-connection-manager';
import { Order } from '../data/models';
import { OrderService } from '../data/order.service';
import { OrderDetailPage } from './order-detail-page';

/** Never opens a real socket in tests — this spec exercises the state-machine/UI logic, not WEB-10's own transport. */
class FakeRealtimeConnectionManager {
  readonly status = () => 'disconnected' as const;
  connect(): void {
    // no-op fake — this spec never needs a real connection attempt
  }
  subscribe(): { subscribe: () => void } {
    return { subscribe: () => undefined };
  }
}

function order(overrides: Partial<Order> = {}): Order {
  return {
    orderId: 'order-1',
    placedAt: new Date().toISOString(),
    status: 'confirmed',
    statusHistory: [{ status: 'confirmed', at: new Date().toISOString() }],
    items: [{ sku: 'A', name: 'Test product', thumbnailUrl: '', unitPrice: { amount: 10, currency: 'USD' }, quantity: 1 }],
    shippingAddress: {
      addressId: 'addr-1',
      fullName: 'Jordan Rivera',
      line1: '1 Market St',
      city: 'SF',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      phone: '555-0100',
      isDefault: true,
    },
    subtotal: { amount: 10, currency: 'USD' },
    discount: { amount: 0, currency: 'USD' },
    total: { amount: 10, currency: 'USD' },
    trackingId: 'KT1',
    ...overrides,
  };
}

describe('OrderDetailPage', () => {
  function setup(fetchedOrder: Order) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [OrderDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG },
        { provide: RealtimeConnectionManager, useClass: FakeRealtimeConnectionManager },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ orderId: fetchedOrder.orderId })) },
        },
      ],
    });
    spyOn(TestBed.inject(OrderService), 'getById').and.returnValue(of(fetchedOrder));
    const fixture = TestBed.createComponent(OrderDetailPage);
    fixture.detectChanges();
    return fixture;
  }

  it('shows the cancel action only while confirmed/processing', () => {
    const fixture = setup(order({ status: 'confirmed' }));
    expect(fixture.componentInstance.availableActions().has('cancel')).toBeTrue();

    const shippedFixture = setup(order({ status: 'shipped' }));
    expect(shippedFixture.componentInstance.availableActions().has('cancel')).toBeFalse();
  });

  it('does not offer request-return for a delivered order once ff-return-request-order-service is off (default)', () => {
    const fixture = setup(
      order({ status: 'delivered', statusHistory: [{ status: 'delivered', at: new Date().toISOString() }] }),
    );
    fixture.detectChanges();

    expect(fixture.componentInstance.availableActions().has('request-return')).toBeTrue();
    expect(TestBed.inject(FeatureFlagsStore).isEnabled('ff-return-request-order-service')).toBeFalse();
    expect(fixture.nativeElement.querySelector('kart-coming-soon')).toBeTruthy();
  });

  it('never offers cancel or request-return for a cancelled order', () => {
    const fixture = setup(order({ status: 'cancelled' }));
    expect(fixture.componentInstance.availableActions().size).toBe(0);
  });
});

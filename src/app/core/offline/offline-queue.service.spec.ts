import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CartService } from '../../features/cart/data/cart.service';
import { OfflineQueueService } from './offline-queue.service';

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  let cartService: CartService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    cartService = TestBed.inject(CartService);
    service = TestBed.inject(OfflineQueueService);
  });

  it('re-checks a queued sku and flags it unavailable once the product is confirmed out of stock on reconnect', () => {
    cartService.add({
      sku: 'HOM-LAMP-ARC-BRS',
      name: 'Arc Floor Lamp',
      thumbnailUrl: '',
      unitPrice: { amount: 149, currency: 'USD' },
      maxQuantity: 5,
      inStock: true,
    });
    service.enqueueRecheck('HOM-LAMP-ARC-BRS');

    window.dispatchEvent(new Event('offline'));
    TestBed.tick();
    window.dispatchEvent(new Event('online'));
    TestBed.tick();

    expect(cartService.cartItems().find((item) => item.sku === 'HOM-LAMP-ARC-BRS')?.inStock).toBeFalse();
  });

  it('does not enqueue the same sku twice', () => {
    service.enqueueRecheck('A');
    service.enqueueRecheck('A');
    TestBed.tick();

    expect(JSON.parse(localStorage.getItem('kart-offline-recheck-queue-v1') ?? '[]').length).toBe(1);
  });
});

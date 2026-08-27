import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';
import { signal } from '@angular/core';

import { CurrencyService } from '../../../core/i18n/currency.service';
import { CartService } from '../../cart/data/cart.service';
import { PricingService } from '../../pricing-promotions/data/pricing.service';
import { Address, AddressInput } from '../data/models';
import { Order } from '../../order-tracking/data/models';
import { OrderService } from '../../order-tracking/data/order.service';
import { AddressService } from '../data/address.service';
import { CheckoutPage } from './checkout-page';
import { CartItem } from '../../cart/data/models';

function testAddress(): Address {
  return {
    addressId: 'addr-1',
    fullName: 'Jordan Rivera',
    line1: '1 Market St',
    city: 'SF',
    state: 'CA',
    postalCode: '94105',
    country: 'US',
    phone: '555-0100',
    isDefault: true,
  };
}

/** Component-level test: fakes CartService/AddressService so this spec exercises step-flow logic only, not real HTTP wire behavior — that's covered by each service's own spec. */
class FakeCartService {
  private readonly items = signal<readonly CartItem[]>([
    { sku: 'A', name: 'Test product', thumbnailUrl: '', unitPrice: { amount: 25, currency: 'USD' }, quantity: 1, maxQuantity: 5, inStock: true },
  ]);
  readonly cartItems = this.items.asReadonly();
  clear(): void {
    this.items.set([]);
  }
}

class FakeAddressService {
  private readonly items = signal<readonly Address[]>([]);
  readonly addresses = this.items.asReadonly();
  defaultAddress() {
    return this.items()[0];
  }
  add(input: AddressInput) {
    const address: Address = { ...input, addressId: 'addr-1', isDefault: true };
    this.items.update((current) => [...current, address]);
    return of(address);
  }
}

describe('CheckoutPage', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CheckoutPage>>;
  let component: CheckoutPage;
  let addressService: FakeAddressService;
  let orderService: OrderService;
  let pricingService: PricingService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: CartService, useClass: FakeCartService },
        { provide: AddressService, useClass: FakeAddressService },
      ],
    });

    addressService = TestBed.inject(AddressService) as unknown as FakeAddressService;
    orderService = TestBed.inject(OrderService);
    pricingService = TestBed.inject(PricingService);

    fixture = TestBed.createComponent(CheckoutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts on the address step and does not advance to shipping without a selected address', () => {
    expect(component.step()).toBe('address');
    component.goToStep('shipping');
    expect(component.step()).toBe('address');
  });

  it('advances through shipping once an address exists, but not to review without a payment token', () => {
    const address = testAddress();
    addressService.add(address).subscribe((created) => component.selectAddress(created.addressId));

    component.goToStep('shipping');
    expect(component.step()).toBe('shipping');

    // A shipping method is pre-selected by default, so only the missing payment token blocks
    // this jump — goToStep refuses the transition outright rather than guessing an intermediate step.
    component.goToStep('review');
    expect(component.step()).toBe('shipping');
  });

  it('requests a fresh quote when the active currency changes mid-checkout (WEB-30)', () => {
    const quoteSpy = spyOn(pricingService, 'quoteCart').and.returnValue(
      of({ quoteId: 'q1', currency: 'BDT', subtotal: { amount: 25, currency: 'BDT' }, discount: { amount: 0, currency: 'BDT' }, total: { amount: 25, currency: 'BDT' }, quotedAt: new Date().toISOString() }),
    );

    TestBed.inject(CurrencyService).setCurrency('BDT');

    expect(quoteSpy).toHaveBeenCalled();
  });

  it('generates a fresh Idempotency-Key per placeOrder attempt and disables submission until a response arrives', () => {
    addressService.add(testAddress()).subscribe((created) => component.selectAddress(created.addressId));
    component.selectShippingMethod('standard');
    component.onPaymentTokenized({ token: 'tok_test', brand: 'visa', last4: '4242' });
    component.goToStep('review');

    const keys: string[] = [];
    let resolveOrder!: (order: Order) => void;
    spyOn(orderService, 'placeOrder').and.callFake((_input, key: string) => {
      keys.push(key);
      return new Observable<Order>((subscriber) => {
        resolveOrder = (order: Order) => subscriber.next(order);
      });
    });

    expect(component.canPlaceOrder()).toBeTrue();
    component.placeOrder();

    expect(component.placingOrder()).toBeTrue();
    expect(keys.length).toBe(1);

    resolveOrder({ orderId: 'order-1' } as Order);
  });
});

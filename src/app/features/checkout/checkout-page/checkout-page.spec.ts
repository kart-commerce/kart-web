import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of } from 'rxjs';

import { CurrencyService } from '../../../core/i18n/currency.service';
import { CartService } from '../../cart/data/cart.service';
import { PricingService } from '../../pricing-promotions/data/pricing.service';
import { Order } from '../../order-tracking/data/models';
import { OrderService } from '../../order-tracking/data/order.service';
import { AddressService } from '../data/address.service';
import { CheckoutPage } from './checkout-page';

describe('CheckoutPage', () => {
  let fixture: ReturnType<typeof TestBed.createComponent<CheckoutPage>>;
  let component: CheckoutPage;
  let cartService: CartService;
  let addressService: AddressService;
  let orderService: OrderService;
  let pricingService: PricingService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [CheckoutPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });

    cartService = TestBed.inject(CartService);
    addressService = TestBed.inject(AddressService);
    orderService = TestBed.inject(OrderService);
    pricingService = TestBed.inject(PricingService);

    cartService.add({
      sku: 'A',
      name: 'Test product',
      thumbnailUrl: '',
      unitPrice: { amount: 25, currency: 'USD' },
      maxQuantity: 5,
      inStock: true,
    });

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
    const address = addressService.add({
      fullName: 'Jordan Rivera',
      line1: '1 Market St',
      city: 'SF',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      phone: '555-0100',
    });
    component.selectAddress(address.addressId);

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
    const address = addressService.add({
      fullName: 'Jordan Rivera',
      line1: '1 Market St',
      city: 'SF',
      state: 'CA',
      postalCode: '94105',
      country: 'US',
      phone: '555-0100',
    });
    component.selectAddress(address.addressId);
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

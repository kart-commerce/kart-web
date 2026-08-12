import { ChangeDetectionStrategy, Component, ViewChild, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { Subject, switchMap } from 'rxjs';

import { Button, Card } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { CurrencyService } from '../../../core/i18n/currency.service';
import { OnlineStatusService } from '../../../core/offline/online-status.service';
import { CartService } from '../../cart/data/cart.service';
import { isQuoteStale } from '../../pricing-promotions/data/models';
import { PricingService } from '../../pricing-promotions/data/pricing.service';
import { OrderService } from '../../order-tracking/data/order.service';
import { AddressForm } from '../address-form/address-form';
import { AddressService } from '../data/address.service';
import { AddressInput } from '../data/models';
import { MOCK_SHIPPING_METHODS, ShippingMethod } from '../data/shipping-method';
import { PaymentToken, PaymentTokenizationField } from '../payment-tokenization-field/payment-tokenization-field';

type CheckoutStep = 'address' | 'shipping' | 'payment' | 'review';
const STEP_ORDER: readonly CheckoutStep[] = ['address', 'shipping', 'payment', 'review'];

/**
 * WEB-31 — the real multi-step flow checkout-and-refunds.md §A.1 specifies: address → shipping
 * → payment (WEB-32's tokenization boundary) → live re-quote → review → Place Order. Every step
 * transition re-validates against current state on entry (no cached client assumption survives
 * a step change) — entering `review` always triggers a fresh quote (`requote()`), never reuses
 * a previous one, and WEB-30's currency-switch race is handled by that same trigger: a
 * `switchMap` naturally cancels an in-flight quote request the moment a newer one (whether from
 * a step re-entry or a currency switch) supersedes it.
 */
@Component({
  selector: 'kart-checkout-page',
  imports: [RouterLink, Card, Button, MoneyPipe, AddressForm, PaymentTokenizationField],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage {
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly pricingService = inject(PricingService);
  private readonly currencyService = inject(CurrencyService);
  protected readonly onlineStatus = inject(OnlineStatusService);
  protected readonly cartService = inject(CartService);
  protected readonly addressService = inject(AddressService);

  protected readonly steps = STEP_ORDER;
  readonly step = signal<CheckoutStep>('address');

  readonly selectedAddressId = signal<string | null>(null);
  readonly addingAddress = signal(false);
  readonly selectedShippingMethodId = signal<string | null>(MOCK_SHIPPING_METHODS[0]?.id ?? null);
  protected readonly shippingMethods: readonly ShippingMethod[] = MOCK_SHIPPING_METHODS;

  @ViewChild(PaymentTokenizationField) private paymentField?: PaymentTokenizationField;

  readonly paymentToken = signal<PaymentToken | null>(null);
  readonly paymentFieldValid = signal(false);

  readonly placingOrder = signal(false);
  readonly placementFailed = signal(false);

  private readonly requoteTrigger$ = new Subject<void>();
  readonly quoting = signal(false);
  readonly quote = toSignal(
    this.requoteTrigger$.pipe(
      switchMap(() => {
        this.quoting.set(true);
        return this.pricingService.quoteCart(this.cartService.cartItems(), this.currencyService.activeCurrency());
      }),
    ),
    { initialValue: null },
  );

  readonly selectedAddress = computed(() =>
    this.addressService.addresses().find((candidate) => candidate.addressId === this.selectedAddressId()),
  );
  readonly selectedShippingMethod = computed(() =>
    this.shippingMethods.find((method) => method.id === this.selectedShippingMethodId()),
  );

  readonly canPlaceOrder = computed(
    () =>
      !!this.selectedAddress() &&
      !!this.selectedShippingMethod() &&
      !!this.paymentToken() &&
      !!this.quote() &&
      !isQuoteStale(this.quote()!) &&
      this.onlineStatus.isOnline() &&
      !this.placingOrder(),
  );

  constructor() {
    const defaultAddress = this.addressService.defaultAddress();
    if (defaultAddress) {
      this.selectedAddressId.set(defaultAddress.addressId);
    }
    // WEB-30: a currency switch mid-checkout invalidates any in-flight quote and re-quotes
    // fresh under the new currency — `switchMap` above cancels the superseded request.
    this.currencyService.currencyChanged$.subscribe(() => this.requoteTrigger$.next());
  }

  selectAddress(addressId: string): void {
    this.selectedAddressId.set(addressId);
  }

  saveNewAddress(input: AddressInput): void {
    this.addressService.add(input).subscribe((address) => {
      this.selectedAddressId.set(address.addressId);
      this.addingAddress.set(false);
    });
  }

  selectShippingMethod(methodId: string): void {
    this.selectedShippingMethodId.set(methodId);
  }

  onPaymentTokenized(token: PaymentToken): void {
    this.paymentToken.set(token);
    if (this.step() === 'payment') {
      this.goToStep('review');
    }
  }

  /**
   * The isolated tokenization iframe only mints a token on an explicit `requestTokenization()`
   * postMessage (WEB-32's isolation boundary) — nothing previously ever sent that request, so
   * `paymentToken()` could never be set and "Continue to review" could never enable. Requesting
   * it here, gated on the field's own reported validity, closes that gap; `onPaymentTokenized`
   * above advances to `review` once the token actually arrives.
   */
  requestPaymentToken(): void {
    this.paymentField?.requestTokenization();
  }

  goToStep(step: CheckoutStep): void {
    if (STEP_ORDER.indexOf(step) > STEP_ORDER.indexOf(this.step())) {
      // Every forward transition re-validates against current state on entry
      // (checkout-and-refunds.md §A.1) rather than trusting a prior step's snapshot.
      if (step !== 'address' && !this.selectedAddress()) {
        return;
      }
      if ((step === 'payment' || step === 'review') && !this.selectedShippingMethod()) {
        return;
      }
      if (step === 'review' && !this.paymentToken()) {
        return;
      }
    }
    this.step.set(step);
    if (step === 'review') {
      this.requoteTrigger$.next();
    }
  }

  placeOrder(): void {
    const address = this.selectedAddress();
    const shippingMethod = this.selectedShippingMethod();
    const quote = this.quote();
    const paymentToken = this.paymentToken();

    if (!address || !shippingMethod || !quote || !paymentToken || !this.canPlaceOrder()) {
      return;
    }

    this.placingOrder.set(true);
    this.placementFailed.set(false);
    const idempotencyKey = crypto.randomUUID();

    this.orderService
      .placeOrder(
        {
          items: this.cartService.cartItems().map((item) => ({
            sku: item.sku,
            name: item.name,
            thumbnailUrl: item.thumbnailUrl,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
          })),
          shippingAddress: address,
          shippingMethod: { label: shippingMethod.label, etaDays: shippingMethod.etaDays },
          // The quote's own Money objects carry the currency active at submission time — this
          // becomes the order's permanently locked transaction currency (localization.md "Order
          // Currency Locking"), resolved before POST /orders fires, never after.
          subtotal: quote.subtotal,
          discount: quote.discount,
          total: quote.total,
          currency: quote.currency,
          gatewayToken: paymentToken.token,
        },
        idempotencyKey,
      )
      .subscribe({
        next: (order) => {
          this.cartService.clear();
          this.router.navigate(['/orders', order.orderId]);
        },
        error: () => {
          this.placingOrder.set(false);
          this.placementFailed.set(true);
        },
      });
  }
}

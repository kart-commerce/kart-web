import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Button, Card, FormField, KartInput } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { CartService } from '../../cart/data/cart.service';
import { OrderService } from '../../order-tracking/data/order.service';
import { AddressForm } from '../address-form/address-form';
import { AddressService } from '../data/address.service';
import { AddressInput } from '../data/models';

/** Single-page checkout: shipping address, mock payment, order summary, place order (J1/J2's checkout step). */
@Component({
  selector: 'kart-checkout-page',
  imports: [ReactiveFormsModule, RouterLink, Card, Button, FormField, KartInput, MoneyPipe, AddressForm],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  protected readonly cartService = inject(CartService);
  protected readonly addressService = inject(AddressService);

  readonly selectedAddressId = signal<string | null>(null);
  readonly addingAddress = signal(false);
  readonly placingOrder = signal(false);
  readonly placementFailed = signal(false);

  readonly paymentForm = this.formBuilder.group({
    cardholderName: ['', Validators.required],
    cardNumber: ['', [Validators.required, Validators.pattern(/^\d{13,19}$/)]],
    expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvc: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  constructor() {
    const defaultAddress = this.addressService.defaultAddress();
    if (defaultAddress) {
      this.selectedAddressId.set(defaultAddress.addressId);
    }
  }

  selectAddress(addressId: string): void {
    this.selectedAddressId.set(addressId);
  }

  saveNewAddress(input: AddressInput): void {
    const address = this.addressService.add(input);
    this.selectedAddressId.set(address.addressId);
    this.addingAddress.set(false);
  }

  placeOrder(): void {
    const address = this.addressService
      .addresses()
      .find((candidate) => candidate.addressId === this.selectedAddressId());

    if (!address || this.paymentForm.invalid || this.placingOrder()) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    this.placingOrder.set(true);
    this.placementFailed.set(false);

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
          subtotal: this.cartService.subtotal(),
          discount: this.cartService.discount(),
          total: this.cartService.total(),
        },
        crypto.randomUUID(),
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

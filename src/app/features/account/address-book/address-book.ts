import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Button, FormField, KartInput } from '../../../shared/ui';
import { Address } from '../../../core/http/generated/user/v1/model/address';
import { AddressInput } from '../../../core/http/generated/user/v1/model/addressInput';
import { AddressType } from '../../../core/http/generated/user/v1/model/addressType';

/** WEB-44 — address book CRUD against kart-user-service's real Address shape (type/line1/line2/city/region/postalCode/countryCode/phone/isDefault). */
@Component({
  selector: 'kart-address-book',
  imports: [ReactiveFormsModule, LowerCasePipe, Button, FormField, KartInput],
  templateUrl: './address-book.html',
  styleUrl: './address-book.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressBook {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly addresses = input.required<readonly Address[]>();
  readonly added = output<AddressInput>();
  readonly updated = output<{ addressId: string; input: AddressInput }>();
  readonly removed = output<string>();

  readonly addressTypes: readonly AddressType[] = ['Shipping', 'Billing', 'Other'];
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.formBuilder.group({
    type: ['Shipping' as AddressType, Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    region: [''],
    postalCode: ['', Validators.required],
    countryCode: ['US', Validators.required],
    phone: [''],
    isDefault: [false],
  });

  startAdd(): void {
    this.editingId.set(null);
    this.form.reset({ type: 'Shipping', countryCode: 'US', isDefault: false });
    this.showForm.set(true);
  }

  startEdit(address: Address): void {
    this.editingId.set(address.addressId);
    this.form.reset({
      type: address.type,
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      region: address.region ?? '',
      postalCode: address.postalCode,
      countryCode: address.countryCode,
      phone: address.phone ?? '',
      isDefault: address.isDefault,
    });
    this.showForm.set(true);
  }

  cancel(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editingId = this.editingId();
    if (editingId) {
      this.updated.emit({ addressId: editingId, input: value });
    } else {
      this.added.emit(value);
    }
    this.showForm.set(false);
    this.editingId.set(null);
  }
}

import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Button, FormField, KartInput } from '../../../shared/ui';
import { AddressInput } from '../data/models';

@Component({
  selector: 'kart-address-form',
  imports: [ReactiveFormsModule, FormField, KartInput, Button],
  templateUrl: './address-form.html',
  styleUrl: './address-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddressForm {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly saved = output<AddressInput>();
  readonly cancelled = output<void>();

  readonly form = this.formBuilder.group({
    fullName: ['', Validators.required],
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['US', Validators.required],
    phone: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.getRawValue());
  }
}

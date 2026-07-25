import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { Button, FormField, KartInput } from '../../../shared/ui';

@Component({
  selector: 'kart-password-reset-request-page',
  imports: [ReactiveFormsModule, RouterLink, Button, FormField, KartInput],
  templateUrl: './password-reset-request-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetRequestPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);

  readonly submitting = signal(false);
  /** Always shown after submit — the backend deliberately never reveals whether the email matched an account. */
  readonly submitted = signal(false);

  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.authService.requestPasswordReset(this.form.getRawValue()).subscribe({
      next: () => this.submitted.set(true),
      error: () => this.submitted.set(true),
    });
  }
}

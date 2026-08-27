import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../core/auth/problem';
import { Alert, Button, FormField, KartInput } from '../../../shared/ui';

@Component({
  selector: 'kart-otp-login-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, FormField, KartInput],
  templateUrl: './otp-login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpLoginPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly codeRequested = signal(false);

  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
  });

  requestCode(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    // Always 202 regardless of whether the email matches an account
    // (identity-service's own account-enumeration-avoidance shape) — the
    // "code sent" state below is shown unconditionally on success.
    this.authService.requestOtp({ email: this.form.getRawValue().email }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.codeRequested.set(true);
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Something went wrong. Please try again.'));
      },
    });
  }

  goToVerify(): void {
    this.router.navigate(['/account/otp-login/verify'], {
      queryParams: { email: this.form.getRawValue().email },
    });
  }
}

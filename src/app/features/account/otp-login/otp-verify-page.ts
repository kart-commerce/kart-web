import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../core/auth/problem';
import { Alert, Button, FormField, KartInput } from '../../../shared/ui';

@Component({
  selector: 'kart-otp-verify-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, FormField, KartInput],
  templateUrl: './otp-verify-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtpVerifyPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly email = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('email') ?? '')),
    { initialValue: '' },
  );

  readonly form = this.formBuilder.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  submit(): void {
    const email = this.email();
    if (this.form.invalid || this.submitting() || !email) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService.verifyOtp({ email, code: this.form.getRawValue().code }).subscribe({
      next: (result) => {
        if (result.status === 'mfa-required') {
          this.router.navigate(['/account/mfa-challenge'], {
            queryParams: { challengeId: result.challenge.challengeId },
          });
          return;
        }
        this.router.navigateByUrl('/');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Invalid or expired code.'));
      },
    });
  }
}

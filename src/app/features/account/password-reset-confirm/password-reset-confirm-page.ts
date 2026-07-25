import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../core/auth/problem';
import { Alert, Button, FormField, KartInput } from '../../../shared/ui';

@Component({
  selector: 'kart-password-reset-confirm-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, FormField, KartInput],
  templateUrl: './password-reset-confirm-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordResetConfirmPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly resetToken = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('token') ?? '')),
    { initialValue: '' },
  );

  readonly form = this.formBuilder.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    const resetToken = this.resetToken();
    if (this.form.invalid || this.submitting() || !resetToken) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .confirmPasswordReset({ resetToken, newPassword: this.form.getRawValue().newPassword })
      .subscribe({
        next: () => this.router.navigate(['/account/login']),
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(
            extractErrorMessage(error, 'This reset link is invalid, expired, or already used.'),
          );
        },
      });
  }
}

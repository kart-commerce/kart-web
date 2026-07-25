import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../core/auth/problem';
import { Alert, Button, FormField, KartInput } from '../../../shared/ui';

@Component({
  selector: 'kart-register-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, FormField, KartInput],
  templateUrl: './register-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.group({
    displayName: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password, displayName } = this.form.getRawValue();

    this.authService
      .register({ email, password, displayName: displayName || undefined })
      .subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(extractErrorMessage(error, 'Registration failed. Please try again.'));
        },
      });
  }
}

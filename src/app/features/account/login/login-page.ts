import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../core/auth/problem';
import { Alert, Button, FormField, KartInput } from '../../../shared/ui';

const SOCIAL_LOGIN_ERROR_MESSAGE = 'Social login failed. Please try again or use your email and password.';

@Component({
  selector: 'kart-login-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, FormField, KartInput],
  templateUrl: './login-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  protected readonly socialLoginErrorMessage = SOCIAL_LOGIN_ERROR_MESSAGE;

  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly socialLoginFailed = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('error') === 'social_login_failed')),
    { initialValue: false },
  );

  readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.form.getRawValue();

    this.authService.login({ email, password }).subscribe({
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
        this.errorMessage.set(extractErrorMessage(error, 'Invalid email or password.'));
      },
    });
  }

  socialLoginUrl(provider: string): string {
    return this.authService.socialLoginUrl(provider);
  }
}

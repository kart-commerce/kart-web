import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { extractErrorMessage } from '../../../core/auth/problem';
import { Alert, Button, FormField, KartInput } from '../../../shared/ui';

@Component({
  selector: 'kart-mfa-challenge-page',
  imports: [ReactiveFormsModule, Alert, Button, FormField, KartInput],
  templateUrl: './mfa-challenge-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MfaChallengePage {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly challengeId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('challengeId') ?? '')),
    { initialValue: '' },
  );

  readonly form = this.formBuilder.group({
    totpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  submit(): void {
    const challengeId = this.challengeId();
    if (this.form.invalid || this.submitting() || !challengeId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.authService
      .verifyMfa({ challengeId, totpCode: this.form.getRawValue().totpCode })
      .subscribe({
        next: () => this.router.navigateByUrl('/'),
        error: (error: unknown) => {
          this.submitting.set(false);
          this.errorMessage.set(extractErrorMessage(error, 'Incorrect or expired code.'));
        },
      });
  }
}

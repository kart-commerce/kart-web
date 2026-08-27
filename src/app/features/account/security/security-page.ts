import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { Button, Card } from '../../../shared/ui';

/**
 * WEB-43 — session/device management. `kart-identity-service`'s approved contract has no
 * session/device *list* endpoint (only `/auth/logout`, optionally revoking the whole
 * refresh-token family) — so "these are your other signed-in devices" can't be built as a
 * literal list yet. What the existing contract does support, and what this page wires up for
 * real: "log out this device only" vs. "log out everywhere" as two genuinely distinct backend
 * calls (`server/bff/routes.ts`'s `/auth/logout-this-device` vs. `/auth/logout`).
 */
@Component({
  selector: 'kart-security-page',
  imports: [Button, Card],
  templateUrl: './security-page.html',
  styleUrl: './security-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecurityPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loggingOutThisDevice = signal(false);
  readonly loggingOutEverywhere = signal(false);

  logoutThisDevice(): void {
    this.loggingOutThisDevice.set(true);
    this.authService.logoutThisDevice().subscribe(() => this.router.navigateByUrl('/'));
  }

  logoutEverywhere(): void {
    this.loggingOutEverywhere.set(true);
    this.authService.logout().subscribe(() => this.router.navigateByUrl('/'));
  }
}

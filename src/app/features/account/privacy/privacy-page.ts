import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { Alert, Button, Card, ComingSoon } from '../../../shared/ui';
import { ExportRequestResult, PrivacyService } from './data/privacy.service';

/** WEB-46/47/48 — GDPR Access/Export, Delete, and Rectification entry points. */
@Component({
  selector: 'kart-privacy-page',
  imports: [RouterLink, DatePipe, Alert, Button, Card, ComingSoon],
  templateUrl: './privacy-page.html',
  styleUrl: './privacy-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPage {
  private readonly privacyService = inject(PrivacyService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly exportEnabled = this.privacyService.isExportEnabled;

  readonly exporting = signal(false);
  readonly exportResult = signal<ExportRequestResult | null>(null);

  readonly deleteConfirming = signal(false);
  readonly deleteAcknowledged = signal(false);
  readonly deleting = signal(false);

  requestExport(): void {
    this.exporting.set(true);
    this.privacyService.requestExport().subscribe((result) => {
      this.exporting.set(false);
      this.exportResult.set(result);
    });
  }

  startDeleteConfirmation(): void {
    this.deleteConfirming.set(true);
    this.deleteAcknowledged.set(false);
  }

  cancelDelete(): void {
    this.deleteConfirming.set(false);
  }

  confirmDelete(): void {
    if (!this.deleteAcknowledged() || this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.privacyService.requestDeletion().subscribe(() => {
      // edge-cases.md "GDPR Erasure Submitted While an Authenticated Session Is Open in Another
      // Tab" — proactively logout+broadcast ahead of the (eventual, async) backend fan-out,
      // reusing the exact same mechanism "log out everywhere" already uses.
      this.authService.logout().subscribe(() => this.router.navigateByUrl('/'));
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';

import { FeatureFlagsStore } from '../../../../core/config/feature-flags.store';

export interface ExportRequestResult {
  readonly requestedAt: string;
  /** Real endpoint returns a 7-day signed download link (privacy.md §B.3-B.4) — mocked here until WEB-XT-3 lands. */
  readonly estimatedReadyBy: string;
}

/**
 * WEB-46/47/48 — GDPR rights UI.
 *
 * Export (WEB-46) is explicitly `🚧`, gated by `ff-gdpr-export-user-service` (WEB-XT-3: no
 * aggregation endpoint exists on kart-user-service yet) — this is a real mock, not a silent
 * stub, matching api-strategy.md §8 stage 1.
 *
 * Deletion (WEB-47) has a *deeper* gap this pass surfaced: kart-user-service's only approved
 * erasure endpoint (`POST /internal/v1/users/{userId}/erasure-requests`) is
 * `clientCredentials: [admin]`-scoped — callable only by Admin Service's own service principal,
 * not by an end-user's own browser session. There is currently no customer-facing erasure-intake
 * endpoint at all (a gap beyond the four WEB-XT tickets this design package already names — see
 * the delivery report). `requestDeletion` below is a mock stand-in for that missing endpoint,
 * not gated by a flag only because no flag was named for it in feature-flags.ts; the same
 * "mocked, not silently done" caveat applies.
 */
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly featureFlags = inject(FeatureFlagsStore);

  get isExportEnabled(): boolean {
    return this.featureFlags.isEnabled('ff-gdpr-export-user-service');
  }

  requestExport(): Observable<ExportRequestResult> {
    const requestedAt = new Date();
    const estimatedReadyBy = new Date(requestedAt.getTime() + 24 * 60 * 60 * 1000);
    return of({ requestedAt: requestedAt.toISOString(), estimatedReadyBy: estimatedReadyBy.toISOString() }).pipe(
      delay(300),
    );
  }

  requestDeletion(): Observable<void> {
    return of(undefined).pipe(delay(300));
  }
}

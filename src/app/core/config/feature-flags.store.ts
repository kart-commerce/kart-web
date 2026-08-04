import { Injectable, signal } from '@angular/core';

import { DEFAULT_FEATURE_FLAGS, FeatureFlagKey, FeatureFlags } from './feature-flags';

/**
 * Holds the FeatureFlags resolved once per SSR bootstrap/session
 * (design-decisions.md "Feature-Flag Resolution Timing & Lifecycle
 * Management") — populated by `provideFeatureFlags()`'s app initializer,
 * never re-fetched for this tab's lifetime.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsStore {
  private readonly flags = signal<FeatureFlags>(DEFAULT_FEATURE_FLAGS);

  setFlags(flags: FeatureFlags): void {
    this.flags.set(flags);
  }

  isEnabled(key: FeatureFlagKey): boolean {
    return this.flags()[key];
  }
}

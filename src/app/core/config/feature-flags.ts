import { InjectionToken, makeStateKey } from '@angular/core';

/**
 * One flag per still-`🚧` row in api-integration-map.md that has no approved
 * backend contract yet, per api-strategy.md §4's `ff-<feature>-<service>`
 * naming convention and four-stage (Mocked → Contract-Tested → Staged → GA)
 * lifecycle. A flag is added here when a feature starts, and deleted the
 * same/next sprint once its guarded feature reaches 100% Production rollout
 * (§4) — this is a typed union, not an arbitrary string, so a stale flag
 * left behind after removal is a compile error at every call site, not a
 * silent dead conditional.
 */
export type FeatureFlagKey =
  /** WEB-35/36 — kart-order-service's ReturnRequest sub-resource doesn't exist yet (WEB-XT-1). */
  | 'ff-return-request-order-service'
  /** WEB-46 — kart-user-service's GDPR export aggregation endpoint doesn't exist yet (WEB-XT-3). */
  | 'ff-gdpr-export-user-service';

export type FeatureFlags = Readonly<Record<FeatureFlagKey, boolean>>;

/**
 * Default state per api-strategy.md §4: OFF in Production, ON in
 * Development/QA (built and demoable against MSW mocks, WEB-4) — flipped ON
 * in Staging/UAT only once the real endpoint is deployed there, per the
 * four-stage lifecycle. Both flags here are still stage 1 (Mocked): neither
 * WEB-XT-1 nor WEB-XT-3 has landed, so Production stays OFF for both
 * regardless of environment-default wiring below.
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  'ff-return-request-order-service': false,
  'ff-gdpr-export-user-service': false,
};

export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS');

export const FEATURE_FLAGS_STATE_KEY = makeStateKey<FeatureFlags>('feature-flags');

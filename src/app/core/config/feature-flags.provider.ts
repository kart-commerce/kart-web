import { isPlatformServer } from '@angular/common';
import {
  EnvironmentProviders,
  PLATFORM_ID,
  TransferState,
  inject,
  provideAppInitializer,
} from '@angular/core';

import { DEFAULT_FEATURE_FLAGS, FEATURE_FLAGS_STATE_KEY } from './feature-flags';
import { readServerFeatureFlags } from './feature-flags.server';
import { FeatureFlagsStore } from './feature-flags.store';

/**
 * Resolves FeatureFlags once per SSR bootstrap (server: awaits Unleash/env
 * resolution and transfers the result; browser: reads what the server
 * already transferred) via an app initializer — the one place in the app an
 * async provider is needed, since `readServerFeatureFlags` may call out to
 * Unleash's HTTP API.
 */
export function provideFeatureFlags(): EnvironmentProviders {
  return provideAppInitializer(async () => {
    const transferState = inject(TransferState);
    const platformId = inject(PLATFORM_ID);
    const store = inject(FeatureFlagsStore);

    if (isPlatformServer(platformId)) {
      const flags = await readServerFeatureFlags();
      transferState.set(FEATURE_FLAGS_STATE_KEY, flags);
      store.setFlags(flags);
      return;
    }

    store.setFlags(transferState.get(FEATURE_FLAGS_STATE_KEY, DEFAULT_FEATURE_FLAGS));
  });
}

import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, Provider, TransferState, inject } from '@angular/core';

import { APP_CONFIG, APP_CONFIG_STATE_KEY, DEFAULT_APP_CONFIG } from './app-config';
import { readServerAppConfig } from './app-config.server';

/**
 * Resolves AppConfig once per request on the server (from process.env) and
 * transfers it to the browser via TransferState on hydration — the browser
 * never re-resolves it from its own environment. Falls back to
 * DEFAULT_APP_CONFIG if TransferState is empty (e.g. `ng serve` without the
 * custom SSR server).
 */
export function provideAppConfig(): Provider {
  return {
    provide: APP_CONFIG,
    useFactory: () => {
      const transferState = inject(TransferState);
      const platformId = inject(PLATFORM_ID);

      if (isPlatformServer(platformId)) {
        const config = readServerAppConfig();
        transferState.set(APP_CONFIG_STATE_KEY, config);
        return config;
      }

      return transferState.get(APP_CONFIG_STATE_KEY, DEFAULT_APP_CONFIG);
    },
  };
}

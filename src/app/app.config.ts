import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { provideAppConfig } from './core/config/app-config.provider';
import { provideFeatureFlags } from './core/config/feature-flags.provider';
import { authInterceptor } from './core/auth/auth.interceptor';
import { provideGeneratedApiClients } from './core/http/generated-clients.provider';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withHttpTransferCacheOptions({ includePostRequests: false })),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAppConfig(),
    provideFeatureFlags(),
    // One BASE_PATH provider per generated client (WEB-3) — see
    // generated-clients.provider.ts for the server-vs-browser base-URL rule
    // every one of them shares.
    ...provideGeneratedApiClients(),
    // WEB-12: PWA installability. No-op outside a browser context (SSR has
    // no `navigator.serviceWorker`), so this is safe in the shared config.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};

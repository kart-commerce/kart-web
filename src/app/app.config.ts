import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';

import { routes } from './app.routes';
import { APP_CONFIG } from './core/config/app-config';
import { provideAppConfig } from './core/config/app-config.provider';
import { authInterceptor } from './core/auth/auth.interceptor';
import { BASE_PATH } from './core/http/generated/category/v1/variables';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideClientHydration(withHttpTransferCacheOptions({ includePostRequests: false })),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideAppConfig(),
    // Generated clients (core/http/generated/**) read their base URL from this
    // token — kept in lockstep with AppConfig.gatewayBaseUrl rather than each
    // generated client's own hardcoded default. `/v1` is appended here (not
    // baked into gatewayBaseUrl) since every kart service contract's own
    // `servers: - url: /v1` is what the generator's relative paths assume.
    { provide: BASE_PATH, useFactory: () => `${inject(APP_CONFIG).gatewayBaseUrl}/v1` },
  ],
};

import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { isPlatformServer } from '@angular/common';
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
    //
    // The server reaches kart-api-gateway directly (server-to-server, no
    // CORS). The browser instead calls same-origin `/v1` — proxied to the
    // gateway by the dev server (proxy.conf.json) or a reverse proxy in
    // deployed environments — since a direct cross-origin browser call would
    // need the gateway to send CORS headers it doesn't send today.
    {
      provide: BASE_PATH,
      useFactory: () =>
        isPlatformServer(inject(PLATFORM_ID)) ? `${inject(APP_CONFIG).gatewayBaseUrl}/v1` : '/v1',
    },
  ],
};

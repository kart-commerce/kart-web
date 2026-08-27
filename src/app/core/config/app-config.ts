import { InjectionToken, makeStateKey } from '@angular/core';

import { SERVICE_ENDPOINTS } from './service-endpoints';

/**
 * Runtime, environment-driven configuration — resolved server-side from
 * process.env at request time (never baked into the build), and carried to
 * the browser via TransferState so the same built image is deployed
 * unchanged across dev/staging/production (ConfigMap-driven, per
 * kart-conventions.md's Kubernetes config model). Only values that are safe
 * to expose to the browser belong here — session tokens never do (see
 * core/auth's BFF session design).
 */
export interface AppConfig {
  /**
   * Base URL of kart-api-gateway, the app's only sync backend dependency for
   * Angular-level (browser + SSR universal) HTTP calls — e.g. the generated
   * category-service client. Defaults to kart-api-gateway's own local dev
   * port (its launchSettings.json http profile — the same host port
   * kart-devops/docker-compose.yml maps it to); override via
   * GATEWAY_BASE_URL for a deployed environment.
   */
  readonly gatewayBaseUrl: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  gatewayBaseUrl: SERVICE_ENDPOINTS.gateway,
};

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const APP_CONFIG_STATE_KEY = makeStateKey<AppConfig>('app-config');

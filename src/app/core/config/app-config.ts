import { InjectionToken, makeStateKey } from '@angular/core';

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
   * category-service client. Defaults to kart-category-service's own local
   * dev port (its README's http launch profile) since kart-api-gateway is
   * only a routing skeleton as of Release 0/1 (no real route table to point
   * at yet); override via GATEWAY_BASE_URL once the gateway actually routes
   * `/v1/categories` requests.
   */
  readonly gatewayBaseUrl: string;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  gatewayBaseUrl: 'http://localhost:5263',
};

export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

export const APP_CONFIG_STATE_KEY = makeStateKey<AppConfig>('app-config');

import { AppConfig, DEFAULT_APP_CONFIG } from './app-config';

/** Reads runtime config from process.env — server-only, never imported into browser-executed code paths. */
export function readServerAppConfig(): AppConfig {
  return {
    gatewayBaseUrl: process.env['GATEWAY_BASE_URL'] ?? DEFAULT_APP_CONFIG.gatewayBaseUrl,
  };
}

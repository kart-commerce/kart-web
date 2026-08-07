/**
 * Server-only client for kart-identity-service's approved api-contract.yaml
 * (server base path `/v1`). Never imported into browser-executed code — the
 * BFF is the only thing that ever holds a token or an identity-service URL.
 *
 * Base URL defaults to the service's own documented local dev port
 * (src/Api/Properties/launchSettings.json, http profile) so this works
 * out of the box against a locally-running kart-identity-service; override
 * via IDENTITY_SERVICE_BASE_URL when routing through kart-api-gateway or a
 * deployed environment instead.
 */
import { logger } from '../logger';
import { SERVICE_ENDPOINTS } from '../../app/core/config/service-endpoints';

const IDENTITY_SERVICE_BASE_URL = process.env['IDENTITY_SERVICE_BASE_URL'] ?? SERVICE_ENDPOINTS.identity;

/**
 * Every call this client makes gets a hard timeout — at 100k-200k req/min across many pods, an
 * identity-service that merely stalls (rather than cleanly erroring) instead of a fast failure
 * would otherwise hold this process's request (and the underlying socket) open indefinitely,
 * turning one slow upstream into cascading resource exhaustion here. `AbortSignal.timeout` turns
 * that into a normal thrown error `identityFetch` already handles like any other network failure.
 */
const IDENTITY_SERVICE_TIMEOUT_MS = Number(process.env['IDENTITY_SERVICE_TIMEOUT_MS'] ?? 10_000);

export interface TokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly roles?: readonly string[];
  readonly scopes?: readonly string[];
}

export interface MfaChallenge {
  readonly challengeId: string;
  readonly expiresInSeconds: number;
}

export interface Problem {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

export interface IdentityResponse<T> {
  readonly status: number;
  readonly body: T;
}

async function identityFetch<T>(path: string, init: RequestInit = {}): Promise<IdentityResponse<T>> {
  const url = `${IDENTITY_SERVICE_BASE_URL}/v1${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(IDENTITY_SERVICE_TIMEOUT_MS),
    });
  } catch (error) {
    logger.error({ err: error, url, method: init.method ?? 'GET' }, 'identityClient: request threw — is kart-identity-service unreachable or stalled?');
    throw error;
  }
  const body = (await response.json().catch(() => ({}))) as T;
  return { status: response.status, body };
}

export const identityClient = {
  register(request: { email: string; password: string; displayName?: string }) {
    return identityFetch<TokenPair | Problem>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  login(request: { email: string; password: string }) {
    return identityFetch<TokenPair | MfaChallenge | Problem>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  verifyMfa(request: { challengeId: string; totpCode: string }) {
    return identityFetch<TokenPair | Problem>('/auth/mfa/verify', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  refresh(request: { refreshToken: string }) {
    return identityFetch<TokenPair | Problem>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  logout(accessToken: string, refreshToken?: string) {
    return identityFetch<Problem | undefined>('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
  },

  initiatePasswordReset(request: { email: string }) {
    return identityFetch<undefined>('/auth/password/reset-initiate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  confirmPasswordReset(request: { resetToken: string; newPassword: string }) {
    return identityFetch<Problem | undefined>('/auth/password/reset-confirm', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Server-to-server leg of the social login callback. Assumption (flagged
   * for confirmation with the kart-identity-service team): the OAuth
   * `redirect_uri` registered with each social IdP for the "customer" flow
   * is kart-web's own BFF callback route
   * (`/api/bff/auth/sso/social/{provider}/callback`), not identity-service's
   * — Google therefore redirects the browser to kart-web first, and this
   * call relays the resulting `code`/`state` to identity-service so it can
   * complete the token exchange with the IdP using its own client secret
   * (identity-service still terminates federation entirely, per
   * security.md §24.2 — kart-web never sees a client secret or talks to the
   * IdP directly).
   */
  socialLoginCallback(provider: string, query: { code: string; state: string }) {
    const params = new URLSearchParams(query);
    return identityFetch<TokenPair | Problem>(
      `/auth/sso/social/${encodeURIComponent(provider)}/callback?${params.toString()}`,
      { method: 'GET' },
    );
  },

  /** Browser-reachable base URL for redirecting to the IdP-initiated login step. */
  socialLoginRedirectUrl(provider: string): string {
    return `${IDENTITY_SERVICE_BASE_URL}/v1/auth/sso/social/${encodeURIComponent(provider)}/login`;
  },
};

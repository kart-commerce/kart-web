/**
 * Client-visible auth/session shapes. Deliberately narrower than
 * kart-identity-service's api-contract.yaml `TokenPair` — the browser never
 * sees an access/refresh token (see server/bff's session store); the BFF
 * translates every identity-service response into one of these instead.
 */
export interface SessionInfo {
  readonly authenticated: boolean;
  readonly roles: readonly string[];
  /** Decoded server-side from the access token's `sub` claim (never the token itself) — which kart-user-service userId this session's profile/address/preferences calls address (WEB-44). */
  readonly userId?: string;
  /** ISO timestamp the current access token expires — feeds `AccessTokenRefreshSchedulerService`'s proactive (pre-401) refresh. Never the token itself, only its expiry. Optional (rather than required-and-nullable) so the many existing `SessionInfo` fixtures across this codebase's tests don't all need updating for a field they don't care about; `AccessTokenRefreshSchedulerService` treats a missing value the same as `null` (nothing to schedule). */
  readonly accessTokenExpiresAt?: string | null;
}

export interface MfaChallenge {
  readonly challengeId: string;
  readonly expiresInSeconds: number;
}

export type LoginResult =
  | { readonly status: 'authenticated'; readonly session: SessionInfo }
  | { readonly status: 'mfa-required'; readonly challenge: MfaChallenge };

export interface RegisterRequest {
  readonly email: string;
  readonly password: string;
  readonly displayName?: string;
}

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface MfaVerifyRequest {
  readonly challengeId: string;
  readonly totpCode: string;
}

export interface PasswordResetInitiateRequest {
  readonly email: string;
}

export interface PasswordResetConfirmRequest {
  readonly resetToken: string;
  readonly newPassword: string;
}

export const UNAUTHENTICATED_SESSION: SessionInfo = { authenticated: false, roles: [] };

import { parseCookie, stringifySetCookie } from 'cookie';

/**
 * `kart_session` — an opaque session-store key, never a token
 * (security.md §1/§2.1: HttpOnly/Secure/SameSite=Strict, browser never
 * holds an access/refresh token directly).
 */
export const SESSION_COOKIE_NAME = 'kart_session';

const SESSION_COOKIE_MAX_AGE_SECONDS = Number(
  process.env['SESSION_TTL_SECONDS'] ?? 60 * 60 * 24 * 90,
);

function isSecureEnvironment(): boolean {
  // Secure cookies require HTTPS; gated off only so local http:// dev works.
  // Behind the platform's real deployment topology (TLS-terminating ingress,
  // architecture.md), this must always evaluate true.
  return process.env['NODE_ENV'] === 'production';
}

export function serializeSessionCookie(sessionId: string): string {
  return stringifySetCookie({
    name: SESSION_COOKIE_NAME,
    value: sessionId,
    httpOnly: true,
    secure: isSecureEnvironment(),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  });
}

export function serializeClearedSessionCookie(): string {
  return stringifySetCookie({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isSecureEnvironment(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}

export function readSessionId(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  return parseCookie(cookieHeader)[SESSION_COOKIE_NAME];
}

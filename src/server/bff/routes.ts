import { randomBytes } from 'node:crypto';
import { Request, Response, Router } from 'express';

import { identityClient, MfaChallenge, Problem, TokenPair } from './identity-client';
import { logger } from '../logger';
import { serializeClearedSessionCookie, serializeSessionCookie, readSessionId } from './cookie';
import { decodeJwtSubject } from './jwt';
import { rateLimit, sessionOrIpKey } from './rate-limit-middleware';
import { sessionStore, StoredSession } from './session-store';

/**
 * Abuse backstops for the auth endpoints (credential stuffing against login/MFA,
 * account-creation abuse against register, email-enumeration/spam against
 * password-reset-initiate, refresh-storm DoS against `/auth/refresh`). Limits are per-IP where
 * the caller has no session yet, and per-session for refresh (see `sessionOrIpKey`'s own doc
 * comment for why). Generous enough that no legitimate customer should ever see a 429 (a human
 * retrying a typo'd password a few times, or this app's own proactive-plus-reactive refresh
 * combo, both stay far under these) while still bounding worst-case abuse load — this matters
 * far more here than in an internal admin tool, given this app's public traffic at 100k+ req/min.
 */
const REGISTER_RATE_LIMIT = rateLimit({ name: 'register', limit: 5, windowSeconds: 600 });
const LOGIN_RATE_LIMIT = rateLimit({ name: 'login', limit: 10, windowSeconds: 60 });
const MFA_RATE_LIMIT = rateLimit({ name: 'mfa', limit: 10, windowSeconds: 60 });
const OTP_REQUEST_RATE_LIMIT = rateLimit({ name: 'otp-request', limit: 5, windowSeconds: 600 });
const OTP_VERIFY_RATE_LIMIT = rateLimit({ name: 'otp-verify', limit: 10, windowSeconds: 60 });
const REFRESH_RATE_LIMIT = rateLimit({ name: 'refresh', limit: 30, windowSeconds: 60, keyFn: sessionOrIpKey });
const PASSWORD_RESET_INITIATE_RATE_LIMIT = rateLimit({ name: 'password-reset-initiate', limit: 5, windowSeconds: 900 });
const PASSWORD_RESET_CONFIRM_RATE_LIMIT = rateLimit({ name: 'password-reset-confirm', limit: 10, windowSeconds: 60 });
const SOCIAL_CALLBACK_RATE_LIMIT = rateLimit({ name: 'social-callback', limit: 30, windowSeconds: 60 });

/**
 * BFF auth/session core (WEB-9). Every route here is same-origin
 * (`/api/bff/*`) and is the *only* thing that ever holds or handles an
 * identity-service access/refresh token — the browser only ever sees the
 * shapes in `core/auth/models.ts`.
 */
export const bffRouter = Router();

function toSessionInfo(stored: StoredSession | null) {
  return stored
    ? { authenticated: true, roles: stored.roles, userId: stored.userId, accessTokenExpiresAt: stored.accessTokenExpiresAt }
    : { authenticated: false, roles: [], accessTokenExpiresAt: null };
}

async function readCurrentSession(req: Request): Promise<{ sessionId: string; session: StoredSession } | null> {
  const sessionId = readSessionId(req.headers.cookie);
  if (!sessionId) {
    return null;
  }
  const session = await sessionStore.get(sessionId);
  return session ? { sessionId, session } : null;
}

/** A little slack subtracted from identity-service's own `expiresIn` so this server's clock never optimistically treats a token as valid a moment after it has actually expired upstream (clock skew / request latency). */
const ACCESS_TOKEN_EXPIRY_SKEW_MS = 5_000;

function accessTokenExpiresAt(tokenPair: TokenPair): string {
  return new Date(Date.now() + tokenPair.expiresIn * 1000 - ACCESS_TOKEN_EXPIRY_SKEW_MS).toISOString();
}

async function establishSession(res: Response, tokenPair: TokenPair): Promise<StoredSession> {
  const stored: StoredSession = {
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    roles: tokenPair.roles ?? [],
    userId: decodeJwtSubject(tokenPair.accessToken),
    accessTokenExpiresAt: accessTokenExpiresAt(tokenPair),
  };
  const sessionId = await sessionStore.create(stored);
  res.setHeader('Set-Cookie', serializeSessionCookie(sessionId));
  return stored;
}

bffRouter.get('/session', async (req, res) => {
  const current = await readCurrentSession(req);
  res.json(toSessionInfo(current?.session ?? null));
});

bffRouter.post('/auth/register', REGISTER_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.register(req.body);
  if (status !== 201) {
    res.status(status).json(body);
    return;
  }
  const stored = await establishSession(res, body as TokenPair);
  res.status(201).json({ status: 'authenticated', session: toSessionInfo(stored) });
});

bffRouter.post('/auth/login', LOGIN_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.login(req.body);

  if (status === 200) {
    const stored = await establishSession(res, body as TokenPair);
    res.json({ status: 'authenticated', session: toSessionInfo(stored) });
    return;
  }

  if (status === 202) {
    res.status(202).json({ status: 'mfa-required', challenge: body as MfaChallenge });
    return;
  }

  res.status(status).json(body as Problem);
});

bffRouter.post('/auth/mfa/verify', MFA_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.verifyMfa(req.body);
  if (status !== 200) {
    res.status(status).json(body);
    return;
  }
  const stored = await establishSession(res, body as TokenPair);
  res.json(toSessionInfo(stored));
});

bffRouter.post('/auth/otp/request', OTP_REQUEST_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.requestOtp(req.body);
  res.status(status).json(body ?? {});
});

bffRouter.post('/auth/otp/verify', OTP_VERIFY_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.verifyOtp(req.body);

  if (status === 200) {
    const stored = await establishSession(res, body as TokenPair);
    res.json({ status: 'authenticated', session: toSessionInfo(stored) });
    return;
  }

  if (status === 202) {
    res.status(202).json({ status: 'mfa-required', challenge: body as MfaChallenge });
    return;
  }

  res.status(status).json(body as Problem);
});

/**
 * `/auth/refresh` concurrency and failure-mode hardening (WEB-9 reliability). Two distinct
 * hazards, both of which must never destroy a session that is actually still good:
 *
 * 1. **Concurrent redemption.** identity-service's refresh token is single-use/rotating, so at
 *    most one caller may ever be mid-flight redeeming a given session's refresh token. At this
 *    app's traffic volume (100k+ req/min, many horizontally-scaled pods, no session affinity),
 *    two requests for the same session landing on two different pods right as their shared
 *    access token expires isn't a rare edge case — it's routine. This is coalesced two ways,
 *    cheapest first:
 *      a) an in-process `Map` — free, handles the common case (one pod, several requests in the
 *         same event loop tick);
 *      b) a Redis-backed lock (`sessionStore.acquireRefreshLock`) — handles the cross-pod case
 *         the `Map` can't. A loser waits on the winner's result rather than racing it
 *         (`awaitConcurrentRefresh`) instead of calling identity-service itself.
 *
 * 2. **Transient upstream failure.** Only identity-service's own 401 (invalid/expired/reused
 *    refresh token) means the session is *actually* dead. A 5xx, a rate-limit, a network blip,
 *    or this call throwing outright are transient — identity-service having a bad moment must
 *    never force a fleet-wide wave of otherwise-valid sessions into a full re-login. Those cases
 *    leave the stored session untouched and report `refresh_temporarily_unavailable` so the
 *    caller (the interceptor's own catchError, or the next natural 401) can just try again.
 */
const refreshInFlight = new Map<string, Promise<{ status: number; body: unknown }>>();

const REFRESH_LOCK_POLL_INTERVAL_MS = 100;
/** How long a loser waits on another pod's in-flight refresh before giving up and reporting transient failure — well under the lock's own TTL plus one full poll cycle of slack. */
const REFRESH_LOCK_MAX_WAIT_MS = 8_000;

const TRANSIENT_REFRESH_PROBLEM = {
  code: 'refresh_temporarily_unavailable',
  message: 'Could not refresh the session right now. Please retry.',
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** True only for identity-service's own definitive "this refresh token is invalid/expired/reused" signal — the one case where tearing the session down is actually correct. */
function isRefreshRejected(status: number): boolean {
  return status === 401;
}

async function redeemRefreshToken(sessionId: string, session: StoredSession): Promise<{ status: number; body: unknown }> {
  let result: { status: number; body: unknown };
  try {
    result = await identityClient.refresh({ refreshToken: session.refreshToken });
  } catch (error) {
    logger.error({ err: error, sessionId }, 'auth/refresh: identityClient.refresh threw — treating as transient');
    return { status: 503, body: TRANSIENT_REFRESH_PROBLEM };
  }

  if (result.status === 200) {
    const tokenPair = result.body as TokenPair;
    const updated: StoredSession = {
      ...session,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      roles: tokenPair.roles ?? session.roles,
      accessTokenExpiresAt: accessTokenExpiresAt(tokenPair),
    };
    await sessionStore.save(sessionId, updated);
    return { status: 200, body: toSessionInfo(updated) };
  }

  if (isRefreshRejected(result.status)) {
    await sessionStore.destroy(sessionId);
    return result;
  }

  // Anything else (5xx, 429, a malformed response) — presumed transient; the session and its
  // still-current refresh token are left exactly as they were.
  logger.warn({ sessionId, status: result.status }, 'auth/refresh: identity-service returned a non-401 failure — treating as transient, session preserved');
  return { status: 503, body: TRANSIENT_REFRESH_PROBLEM };
}

/**
 * Called by a request that lost the cross-instance lock race. Rather than attempting its own
 * redemption (which would trip identity-service's reuse detection), it polls the shared session
 * record for the outcome the lock-holder is about to (or just did) produce.
 */
async function awaitConcurrentRefresh(sessionId: string, staleSession: StoredSession): Promise<{ status: number; body: unknown }> {
  const deadline = Date.now() + REFRESH_LOCK_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await sleep(REFRESH_LOCK_POLL_INTERVAL_MS);
    const latest = await sessionStore.get(sessionId);
    if (!latest) {
      // The winning redemption found the refresh token genuinely invalid/reused and tore the
      // session down — that outcome applies to this caller too.
      return { status: 401, body: { code: 'refresh_failed', message: 'Session is no longer valid.' } };
    }
    if (latest.accessToken !== staleSession.accessToken || latest.refreshToken !== staleSession.refreshToken) {
      // The winner rotated the tokens — this caller's request is satisfied by that outcome too.
      return { status: 200, body: toSessionInfo(latest) };
    }
  }
  // The lock holder hasn't published a result within a generous window (it may have died — the
  // lock's own TTL will free it up shortly). Never destroy the session on a timeout: it may well
  // still be perfectly valid.
  logger.warn({ sessionId }, 'auth/refresh: timed out waiting on a concurrent refresh held by another instance');
  return { status: 503, body: TRANSIENT_REFRESH_PROBLEM };
}

async function refreshWithDistributedLock(sessionId: string, session: StoredSession): Promise<{ status: number; body: unknown }> {
  const fencingToken = randomBytes(16).toString('hex');
  const acquired = await sessionStore.acquireRefreshLock(sessionId, fencingToken);

  if (!acquired) {
    return awaitConcurrentRefresh(sessionId, session);
  }

  try {
    return await redeemRefreshToken(sessionId, session);
  } finally {
    await sessionStore.releaseRefreshLock(sessionId, fencingToken);
  }
}

/** In-process fast path in front of the distributed lock — free, and covers the common single-pod case without a single extra Redis round trip. */
function coalescedRefresh(sessionId: string, session: StoredSession): Promise<{ status: number; body: unknown }> {
  let pending = refreshInFlight.get(sessionId);
  if (!pending) {
    pending = refreshWithDistributedLock(sessionId, session).finally(() => refreshInFlight.delete(sessionId));
    refreshInFlight.set(sessionId, pending);
  }
  return pending;
}

bffRouter.post('/auth/refresh', REFRESH_RATE_LIMIT, async (req, res) => {
  const current = await readCurrentSession(req);
  if (!current) {
    res.status(401).json({ code: 'no_session', message: 'No active session to refresh.' });
    return;
  }

  const { status, body } = await coalescedRefresh(current.sessionId, current.session);
  if (isRefreshRejected(status)) {
    res.setHeader('Set-Cookie', serializeClearedSessionCookie());
  }
  res.status(status).json(body);
});

/** WEB-43 "log out everywhere" — revokes this session's entire refresh-token family (identity-service's own documented `/auth/logout` behavior when `refreshToken` is supplied), so every device/tab descended from this login is invalidated, not just this one. */
bffRouter.post('/auth/logout', async (req, res) => {
  const current = await readCurrentSession(req);
  if (current) {
    await identityClient
      .logout(current.session.accessToken, current.session.refreshToken)
      .catch(() => undefined);
    await sessionStore.destroy(current.sessionId);
  }
  res.setHeader('Set-Cookie', serializeClearedSessionCookie());
  res.status(204).end();
});

/** WEB-43 "log out this device" — ends only this BFF session; the refresh-token family (and therefore any other device/tab still holding a valid refresh token from it) is left untouched. */
bffRouter.post('/auth/logout-this-device', async (req, res) => {
  const current = await readCurrentSession(req);
  if (current) {
    await identityClient.logout(current.session.accessToken).catch(() => undefined);
    await sessionStore.destroy(current.sessionId);
  }
  res.setHeader('Set-Cookie', serializeClearedSessionCookie());
  res.status(204).end();
});

bffRouter.post('/auth/password/reset-initiate', PASSWORD_RESET_INITIATE_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.initiatePasswordReset(req.body);
  res.status(status).json(body ?? {});
});

bffRouter.post('/auth/password/reset-confirm', PASSWORD_RESET_CONFIRM_RATE_LIMIT, async (req, res) => {
  const { status, body } = await identityClient.confirmPasswordReset(req.body);
  res.status(status).json(body ?? {});
});

bffRouter.get('/auth/sso/social/:provider/login', (req: Request, res: Response) => {
  const provider = String(req.params['provider']);
  res.redirect(302, identityClient.socialLoginRedirectUrl(provider));
});

bffRouter.get('/auth/sso/social/:provider/callback', SOCIAL_CALLBACK_RATE_LIMIT, async (req: Request, res: Response) => {
  const provider = String(req.params['provider']);
  const code = String(req.query['code'] ?? '');
  const state = String(req.query['state'] ?? '');

  if (!code || !state) {
    res.redirect('/account/login?error=social_login_failed');
    return;
  }

  const { status, body } = await identityClient.socialLoginCallback(provider, { code, state });
  if (status !== 200) {
    res.redirect('/account/login?error=social_login_failed');
    return;
  }

  await establishSession(res, body as TokenPair);
  res.redirect('/');
});

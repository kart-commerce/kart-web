import { randomBytes } from 'node:crypto';
import Redis from 'ioredis';

import { REDIS_LOCAL_URL } from '../../app/core/config/service-endpoints';

/**
 * Server-held session record — this, not the browser cookie, is where the
 * access/refresh token pair actually lives (security.md's BFF pattern).
 * Backed by Redis rather than in-process memory because kart-web's SSR pods
 * are horizontally scaled and stateless (architecture.md) — any pod must be
 * able to serve a request for any session.
 */
export interface StoredSession {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly roles: readonly string[];
  /** Decoded from the access token's `sub` claim at session-establishment time (see `jwt.ts`) — which kart-user-service userId this session's profile/address calls address. */
  readonly userId?: string;
  /** ISO timestamp — when the *current* `accessToken` expires (from identity-service's `expiresIn`), refreshed on every rotation. Lets the client schedule a proactive refresh ahead of expiry instead of relying solely on a reactive 401 (see `AccessTokenRefreshSchedulerService`). */
  readonly accessTokenExpiresAt: string;
}

const SESSION_KEY_PREFIX = 'session:';
const REFRESH_LOCK_PREFIX = 'session-refresh-lock:';

/**
 * 90 days — the native-login session's *maximum* Redis TTL. NOTE: this is a **sliding** window,
 * not an absolute cap despite the name this constant's callers might suggest — `save()` (called
 * on every successful login *and* every refresh) resets the Redis key's `EX` back to the full
 * `ttlSeconds` each time, so a continuously-active session's actual lifetime is unbounded, only
 * ever expiring after `ttlSeconds` of *inactivity*. If a true fixed absolute cap (a session that
 * expires N days after login regardless of activity, the way kart-admin-web's Admin/Support
 * Agent sessions do — see that repo's `ABSOLUTE_CAP_HOURS`) is actually the intended policy here,
 * this needs an `absoluteCapAt` computed once at `create()` time and never renewed, same shape as
 * admin-web's `StoredSession.absoluteCapAt`. Flagging rather than silently changing this, since
 * "how long can an active customer session live" is a product/security decision, not a pure
 * reliability fix.
 */
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;

/**
 * How long a refresh lock is held before it self-expires. Generous relative to a normal
 * identity-service round-trip, but short enough that a holder that crashed/was killed mid-refresh
 * doesn't wedge every other pod's refresh attempts for this session for long.
 */
const REFRESH_LOCK_TTL_MS = 8_000;

/**
 * Releases a refresh lock only if it still holds the caller's own fencing token — a plain `DEL`
 * would risk deleting a *different* holder's lock if this caller's own hold outlived the TTL and
 * someone else has since acquired it (classic distributed-lock pitfall). Atomic via Lua so the
 * check-and-delete can't itself race a concurrent acquire.
 */
const RELEASE_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export class SessionStore {
  private readonly redis: Redis;
  private readonly ttlSeconds: number;

  constructor(
    redisUrl = process.env['REDIS_URL'] ?? REDIS_LOCAL_URL,
    ttlSeconds = Number(process.env['SESSION_TTL_SECONDS'] ?? DEFAULT_SESSION_TTL_SECONDS),
  ) {
    this.redis = new Redis(redisUrl, { lazyConnect: true });
    this.ttlSeconds = ttlSeconds;
  }

  async create(session: StoredSession): Promise<string> {
    const sessionId = randomBytes(32).toString('base64url');
    await this.save(sessionId, session);
    return sessionId;
  }

  async save(sessionId: string, session: StoredSession): Promise<void> {
    await this.redis.set(SESSION_KEY_PREFIX + sessionId, JSON.stringify(session), 'EX', this.ttlSeconds);
  }

  async get(sessionId: string): Promise<StoredSession | null> {
    const raw = await this.redis.get(SESSION_KEY_PREFIX + sessionId);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  }

  async destroy(sessionId: string): Promise<void> {
    await this.redis.del(SESSION_KEY_PREFIX + sessionId);
  }

  /**
   * Cross-instance mutual exclusion for `/auth/refresh` (reliability hardening, WEB-9): the
   * identity service's refresh token is single-use/rotating, so at most one BFF pod may ever be
   * mid-flight redeeming a given session's refresh token at a time — a second, concurrent
   * redemption looks like refresh-token *reuse* to identity-service and gets the whole session
   * torn down, even though the first redemption was perfectly legitimate. At this app's traffic
   * volume (100k+ req/min across many horizontally-scaled pods with no session affinity), two
   * requests for the same session landing on two different pods at the exact moment their shared
   * access token expires is not a rare edge case — it's routine. This lock is what makes that safe.
   *
   * Returns `true` iff this caller now holds the lock. Callers that don't must not call
   * `identityClient.refresh()` themselves — see `routes.ts`'s `awaitConcurrentRefresh`.
   */
  async acquireRefreshLock(sessionId: string, fencingToken: string): Promise<boolean> {
    const result = await this.redis.set(REFRESH_LOCK_PREFIX + sessionId, fencingToken, 'PX', REFRESH_LOCK_TTL_MS, 'NX');
    return result === 'OK';
  }

  /** Releases a refresh lock this caller holds. A no-op (not an error) if it already expired or was never held. */
  async releaseRefreshLock(sessionId: string, fencingToken: string): Promise<void> {
    await this.redis.eval(RELEASE_LOCK_SCRIPT, 1, REFRESH_LOCK_PREFIX + sessionId, fencingToken);
  }
}

export const sessionStore = new SessionStore();

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
}

const SESSION_KEY_PREFIX = 'session:';

/** 90 days — security.md's native-login absolute session cap. */
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;

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
}

export const sessionStore = new SessionStore();

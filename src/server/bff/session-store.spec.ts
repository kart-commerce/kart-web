import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StoredSession } from './session-store';

const store = new Map<string, string>();

vi.mock('ioredis', () => ({
  default: class FakeRedis {
    // Mirrors the one overload this codebase actually uses: `SET key value 'PX' ms 'NX'`
    // (the refresh lock) vs. the plain `SET key value 'EX' seconds` (session persistence).
    // Real ioredis's SET NX returns null (not stored) rather than throwing when the key
    // already exists — reproduced here so `acquireRefreshLock`'s `=== 'OK'` check is exercised
    // the same way it would be against a real server.
    async set(key: string, value: string, ...args: unknown[]): Promise<string | null> {
      if (args[args.length - 1] === 'NX' && store.has(key)) {
        return null;
      }
      store.set(key, value);
      return 'OK';
    }
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null;
    }
    async del(key: string): Promise<void> {
      store.delete(key);
    }
    // Only ever invoked with the compare-and-delete release script — reproduces its exact
    // semantics rather than genuinely interpreting Lua.
    async eval(_script: string, _numKeys: number, key: string, expectedValue: string): Promise<number> {
      if (store.get(key) === expectedValue) {
        store.delete(key);
        return 1;
      }
      return 0;
    }
  },
}));

function mkSession(overrides: Partial<StoredSession> = {}): StoredSession {
  return {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    roles: ['customer'],
    userId: 'user-1',
    accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    ...overrides,
  };
}

describe('SessionStore', () => {
  beforeEach(() => {
    store.clear();
  });

  it('create() persists a session and returns a sessionId', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();
    const session = mkSession();

    const sessionId = await sessionStore.create(session);

    expect(sessionId).toBeTruthy();
    expect(await sessionStore.get(sessionId)).toEqual(session);
  });

  it('get() returns null for an unknown session id', async () => {
    const { SessionStore } = await import('./session-store');
    expect(await new SessionStore().get('nonexistent')).toBeNull();
  });

  it('destroy() removes the session', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();
    const sessionId = await sessionStore.create(mkSession());

    await sessionStore.destroy(sessionId);
    expect(await sessionStore.get(sessionId)).toBeNull();
  });

  it('save() updates an existing session (e.g. rotated tokens after refresh)', async () => {
    const { SessionStore } = await import('./session-store');
    const sessionStore = new SessionStore();
    const sessionId = await sessionStore.create(mkSession());

    await sessionStore.save(sessionId, mkSession({ accessToken: 'new-access', refreshToken: 'new-refresh' }));
    const updated = await sessionStore.get(sessionId);

    expect(updated?.accessToken).toBe('new-access');
    expect(updated?.refreshToken).toBe('new-refresh');
  });

  describe('refresh lock (cross-instance mutual exclusion for /auth/refresh)', () => {
    it('acquireRefreshLock() grants the lock when nobody holds it, and refuses a second caller while it is held', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-a')).toBe(true);
      // A different caller (a different pod, in production) racing for the same session must not
      // also be granted the lock — this is the entire point of the mechanism.
      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-b')).toBe(false);
    });

    it('releaseRefreshLock() lets a subsequent caller acquire it', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      await sessionStore.acquireRefreshLock('session-1', 'holder-a');
      await sessionStore.releaseRefreshLock('session-1', 'holder-a');

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-b')).toBe(true);
    });

    it("releaseRefreshLock() with the wrong fencing token does not release someone else's lock", async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      await sessionStore.acquireRefreshLock('session-1', 'holder-a');
      // holder-a's hold outlived its TTL and holder-b has since legitimately acquired it —
      // holder-a's (late) release must not delete holder-b's live lock.
      await sessionStore.releaseRefreshLock('session-1', 'a-stale-fencing-token-not-currently-held');

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-c')).toBe(false);
    });

    it('locks for different sessions are independent', async () => {
      const { SessionStore } = await import('./session-store');
      const sessionStore = new SessionStore();

      expect(await sessionStore.acquireRefreshLock('session-1', 'holder-a')).toBe(true);
      expect(await sessionStore.acquireRefreshLock('session-2', 'holder-b')).toBe(true);
    });
  });
});

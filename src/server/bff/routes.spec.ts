import express from 'express';
import { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { identityClient } from './identity-client';
import { rateLimiter } from './rate-limiter';
import { sessionStore } from './session-store';

// identity-client's mock below pulls in its real module (importActual, to keep
// socialLoginRedirectUrl etc. genuine) — which imports '../logger' at module scope. Mock it
// here too, or that real import constructs a real pino file destination
// (logs/bff-server.log) on every routes.spec.ts run.
vi.mock('../logger', () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

vi.mock('./identity-client', async () => {
  const actual = await vi.importActual<typeof import('./identity-client')>('./identity-client');
  return {
    ...actual,
    identityClient: {
      register: vi.fn(),
      login: vi.fn(),
      verifyMfa: vi.fn(),
      refresh: vi.fn(),
      logout: vi.fn().mockResolvedValue({ status: 204, body: undefined }),
      initiatePasswordReset: vi.fn(),
      confirmPasswordReset: vi.fn(),
      socialLoginCallback: vi.fn(),
      socialLoginRedirectUrl: vi.fn((provider: string) => `https://idp.example/${provider}/login`),
    },
  };
});

// This suite's own concern is routing/session logic, not rate limiting (that's
// rate-limiter.spec.ts / rate-limit-middleware.spec.ts) — and without this mock, every one of
// this file's several dozen login/register/refresh calls would share one real (or, in this test
// environment, unreachable) Redis-backed counter, tripping 429s well before the file finishes.
// Defaults to always-allow; individual tests override with `mockResolvedValueOnce` to exercise
// the 429 path itself.
vi.mock('./rate-limiter', () => ({
  rateLimiter: { consume: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }) },
}));

vi.mock('./session-store', async () => {
  const actual = await vi.importActual<typeof import('./session-store')>('./session-store');
  const memory = new Map<string, unknown>();
  const locks = new Map<string, string>();
  return {
    ...actual,
    sessionStore: {
      create: vi.fn(async (session: Record<string, unknown>) => {
        const sessionId = `session-${memory.size + 1}`;
        memory.set(sessionId, session);
        return sessionId;
      }),
      get: vi.fn(async (sessionId: string) => memory.get(sessionId) ?? null),
      save: vi.fn(async (sessionId: string, session: unknown) => {
        memory.set(sessionId, session);
      }),
      destroy: vi.fn(async (sessionId: string) => {
        memory.delete(sessionId);
      }),
      // Real semantics (NX-acquire / compare-and-delete release), backed by an in-memory map
      // instead of Redis — sufficient to exercise routes.ts's lock-usage logic in these tests;
      // session-store.spec.ts covers the primitive itself against a fake Redis client.
      acquireRefreshLock: vi.fn(async (sessionId: string, fencingToken: string) => {
        if (locks.has(sessionId)) {
          return false;
        }
        locks.set(sessionId, fencingToken);
        return true;
      }),
      releaseRefreshLock: vi.fn(async (sessionId: string, fencingToken: string) => {
        if (locks.get(sessionId) === fencingToken) {
          locks.delete(sessionId);
        }
      }),
    },
    __memory: memory,
  };
});

const TOKEN_PAIR = {
  accessToken: 'header.eyJzdWIiOiJ1c2VyLTEifQ.sig',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  roles: ['customer'],
};

describe('bffRouter', () => {
  let baseUrl: string;
  let server: ReturnType<express.Express['listen']>;

  beforeAll(async () => {
    const { bffRouter } = await import('./routes');
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use('/api/bff', bffRouter);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}/api/bff`;
  });

  afterAll(() => {
    server.close();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('GET /session returns unauthenticated with no cookie', async () => {
    const res = await fetch(`${baseUrl}/session`);
    const body = await res.json();
    expect(body).toEqual({ authenticated: false, roles: [], accessTokenExpiresAt: null });
  });

  it('POST /auth/register establishes a session on a 201 TokenPair', async () => {
    (identityClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 201, body: TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.status).toBe('authenticated');
    expect(body.session.roles).toEqual(['customer']);
    expect(body.session.accessTokenExpiresAt).toBeTruthy();
    expect(res.headers.get('set-cookie')).toContain('kart_session=');
  });

  it('POST /auth/register passes through a non-201 Problem (e.g. email already registered)', async () => {
    (identityClient.register as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 409,
      body: { code: 'email_taken', message: 'Email already registered.' },
    });

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });

    expect(res.status).toBe(409);
  });

  it('POST /auth/register returns 429 with Retry-After when rate-limited', async () => {
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 55 });

    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('55');
    expect(identityClient.register).not.toHaveBeenCalled();
  });

  it('POST /auth/login establishes a session on a 200 TokenPair', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('authenticated');
    expect(res.headers.get('set-cookie')).toContain('kart_session=');
  });

  it('POST /auth/login returns an mfa-required challenge on a 202', async () => {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 202,
      body: { challengeId: 'c1', expiresInSeconds: 300 },
    });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    const body = await res.json();

    expect(res.status).toBe(202);
    expect(body.status).toBe('mfa-required');
    expect(body.challenge.challengeId).toBe('c1');
  });

  it('POST /auth/login returns 429 with Retry-After when rate-limited', async () => {
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 30 });

    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });

    expect(res.status).toBe(429);
    expect(identityClient.login).not.toHaveBeenCalled();
  });

  it('POST /auth/mfa/verify establishes a session on success', async () => {
    (identityClient.verifyMfa as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'c1', totpCode: '000000' }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.authenticated).toBe(true);
    expect(res.headers.get('set-cookie')).toContain('kart_session=');
  });

  it('POST /auth/mfa/verify passes through an incorrect-code Problem', async () => {
    (identityClient.verifyMfa as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'invalid_code', message: 'Incorrect code.' },
    });

    const res = await fetch(`${baseUrl}/auth/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'c1', totpCode: '000000' }),
    });

    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh with no cookie returns 401', async () => {
    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST' });
    expect(res.status).toBe(401);
    expect((await res.json()).code).toBe('no_session');
  });

  async function loginAndGetCookie(): Promise<string> {
    (identityClient.login as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: TOKEN_PAIR });
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'secret' }),
    });
    return loginRes.headers.get('set-cookie')?.split(';')[0] ?? '';
  }

  it('POST /auth/refresh rotates tokens and keeps the session', async () => {
    const cookie = await loginAndGetCookie();

    (identityClient.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 200,
      body: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900, roles: ['customer'] },
    });

    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    expect(refreshRes.status).toBe(200);
    expect((await refreshRes.json()).authenticated).toBe(true);
  });

  it('POST /auth/refresh clears the session cookie when the refresh token was reused/revoked', async () => {
    const cookie = await loginAndGetCookie();

    (identityClient.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 401,
      body: { code: 'refresh_reuse_detected', message: 'Session revoked.' },
    });

    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('POST /auth/refresh preserves the session on a transient (non-401) upstream failure', async () => {
    const cookie = await loginAndGetCookie();
    const sessionId = cookie.split('=')[1];

    (identityClient.refresh as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 503,
      body: { code: 'service_unavailable', message: 'identity-service is having a bad day.' },
    });

    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('refresh_temporarily_unavailable');
    expect(res.headers.get('set-cookie')).toBeNull(); // never cleared on a transient failure
    expect(await sessionStore.get(sessionId)).not.toBeNull(); // session survives intact
  });

  it('POST /auth/refresh preserves the session when identityClient.refresh throws (e.g. identity-service unreachable)', async () => {
    const cookie = await loginAndGetCookie();
    const sessionId = cookie.split('=')[1];

    (identityClient.refresh as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('refresh_temporarily_unavailable');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(await sessionStore.get(sessionId)).not.toBeNull();
  });

  it('POST /auth/refresh coalesces concurrent calls for the same session into a single upstream refresh', async () => {
    const cookie = await loginAndGetCookie();

    // Simulates several requests 401ing around the same moment right after the access token
    // expires: without coalescing, the second call to reach identityClient.refresh would be
    // presented with the same (now-consumed) refresh token and get treated as reuse.
    (identityClient.refresh as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ status: 200, body: { accessToken: 'new-access', refreshToken: 'new-refresh', tokenType: 'Bearer', expiresIn: 900 } }),
            20,
          ),
        ),
    );

    const [first, second] = await Promise.all([
      fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } }),
      fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } }),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await first.json()).authenticated).toBe(true);
    expect((await second.json()).authenticated).toBe(true);
    expect(identityClient.refresh).toHaveBeenCalledTimes(1);
  });

  it('POST /auth/refresh adopts the outcome of a refresh already in progress on another BFF instance', async () => {
    const cookie = await loginAndGetCookie();
    const sessionId = cookie.split('=')[1];

    // Simulate the cross-instance lock already being held elsewhere for this exact session —
    // this instance must poll for the outcome rather than also calling identityClient.refresh().
    (sessionStore.acquireRefreshLock as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    // ...and simulate that other instance completing the rotation partway through our poll loop.
    const before = await sessionStore.get(sessionId);
    if (!before) {
      throw new Error('expected the session just created via login to exist');
    }
    setTimeout(() => {
      void sessionStore.save(sessionId, { ...before, accessToken: 'rotated-by-other-instance', refreshToken: 'rotated-by-other-instance-refresh' });
    }, 150);

    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(200);
    expect((await res.json()).authenticated).toBe(true);
    expect(identityClient.refresh).not.toHaveBeenCalled();
  });

  it('POST /auth/refresh returns 429 with Retry-After when rate-limited', async () => {
    const cookie = await loginAndGetCookie();
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 12 });

    const res = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(429);
    expect(identityClient.refresh).not.toHaveBeenCalled();
  });

  it('POST /auth/logout clears the cookie regardless of whether a session existed', async () => {
    const res = await fetch(`${baseUrl}/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(204);
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('POST /auth/logout revokes the whole refresh-token family (passes refreshToken to identityClient.logout)', async () => {
    const cookie = await loginAndGetCookie();

    await fetch(`${baseUrl}/auth/logout`, { method: 'POST', headers: { Cookie: cookie } });

    expect(identityClient.logout).toHaveBeenCalledWith(TOKEN_PAIR.accessToken, TOKEN_PAIR.refreshToken);
  });

  it('POST /auth/logout-this-device revokes only this session (no refreshToken passed)', async () => {
    const cookie = await loginAndGetCookie();

    const res = await fetch(`${baseUrl}/auth/logout-this-device`, { method: 'POST', headers: { Cookie: cookie } });

    expect(res.status).toBe(204);
    expect(identityClient.logout).toHaveBeenCalledWith(TOKEN_PAIR.accessToken);
  });

  it('POST /auth/password/reset-initiate proxies to identityClient and is rate-limited', async () => {
    (identityClient.initiatePasswordReset as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 202, body: undefined });

    const res = await fetch(`${baseUrl}/auth/password/reset-initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    expect(res.status).toBe(202);

    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 900 });
    const limited = await fetch(`${baseUrl}/auth/password/reset-initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com' }),
    });
    expect(limited.status).toBe(429);
  });

  it('POST /auth/password/reset-confirm proxies to identityClient', async () => {
    (identityClient.confirmPasswordReset as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: undefined });

    const res = await fetch(`${baseUrl}/auth/password/reset-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resetToken: 't', newPassword: 'p' }),
    });
    expect(res.status).toBe(200);
  });

  it('GET /auth/sso/social/:provider/login redirects to the social IdP', async () => {
    const res = await fetch(`${baseUrl}/auth/sso/social/google/login`, { redirect: 'manual' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('idp.example');
  });

  it('GET /auth/sso/social/:provider/callback establishes a session and redirects home on success', async () => {
    (identityClient.socialLoginCallback as ReturnType<typeof vi.fn>).mockResolvedValue({ status: 200, body: TOKEN_PAIR });

    const res = await fetch(`${baseUrl}/auth/sso/social/google/callback?code=abc&state=xyz`, { redirect: 'manual' });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/');
    expect(res.headers.get('set-cookie')).toContain('kart_session=');
  });

  it('GET /auth/sso/social/:provider/callback redirects to an error page on failure', async () => {
    (identityClient.socialLoginCallback as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 400,
      body: { code: 'invalid_state', message: 'State mismatch.' },
    });

    const res = await fetch(`${baseUrl}/auth/sso/social/google/callback?code=abc&state=xyz`, { redirect: 'manual' });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toContain('error=social_login_failed');
  });

  it('GET /auth/sso/social/:provider/callback returns 429 when rate-limited', async () => {
    (rateLimiter.consume as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 20 });

    const res = await fetch(`${baseUrl}/auth/sso/social/google/callback?code=abc&state=xyz`, { redirect: 'manual' });

    expect(res.status).toBe(429);
    expect(identityClient.socialLoginCallback).not.toHaveBeenCalled();
  });
});

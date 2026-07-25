import { Request, Response, Router } from 'express';

import { identityClient, MfaChallenge, Problem, TokenPair } from './identity-client';
import { serializeClearedSessionCookie, serializeSessionCookie, readSessionId } from './cookie';
import { sessionStore, StoredSession } from './session-store';

/**
 * BFF auth/session core (WEB-9). Every route here is same-origin
 * (`/api/bff/*`) and is the *only* thing that ever holds or handles an
 * identity-service access/refresh token — the browser only ever sees the
 * shapes in `core/auth/models.ts`.
 */
export const bffRouter = Router();

function toSessionInfo(stored: StoredSession | null) {
  return stored ? { authenticated: true, roles: stored.roles } : { authenticated: false, roles: [] };
}

async function readCurrentSession(req: Request): Promise<{ sessionId: string; session: StoredSession } | null> {
  const sessionId = readSessionId(req.headers.cookie);
  if (!sessionId) {
    return null;
  }
  const session = await sessionStore.get(sessionId);
  return session ? { sessionId, session } : null;
}

async function establishSession(res: Response, tokenPair: TokenPair): Promise<void> {
  const sessionId = await sessionStore.create({
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    roles: tokenPair.roles ?? [],
  });
  res.setHeader('Set-Cookie', serializeSessionCookie(sessionId));
}

bffRouter.get('/session', async (req, res) => {
  const current = await readCurrentSession(req);
  res.json(toSessionInfo(current?.session ?? null));
});

bffRouter.post('/auth/register', async (req, res) => {
  const { status, body } = await identityClient.register(req.body);
  if (status !== 201) {
    res.status(status).json(body);
    return;
  }
  const tokenPair = body as TokenPair;
  await establishSession(res, tokenPair);
  res
    .status(201)
    .json({ status: 'authenticated', session: { authenticated: true, roles: tokenPair.roles ?? [] } });
});

bffRouter.post('/auth/login', async (req, res) => {
  const { status, body } = await identityClient.login(req.body);

  if (status === 200) {
    const tokenPair = body as TokenPair;
    await establishSession(res, tokenPair);
    res.json({ status: 'authenticated', session: { authenticated: true, roles: tokenPair.roles ?? [] } });
    return;
  }

  if (status === 202) {
    res.status(202).json({ status: 'mfa-required', challenge: body as MfaChallenge });
    return;
  }

  res.status(status).json(body as Problem);
});

bffRouter.post('/auth/mfa/verify', async (req, res) => {
  const { status, body } = await identityClient.verifyMfa(req.body);
  if (status !== 200) {
    res.status(status).json(body);
    return;
  }
  const tokenPair = body as TokenPair;
  await establishSession(res, tokenPair);
  res.json({ authenticated: true, roles: tokenPair.roles ?? [] });
});

bffRouter.post('/auth/refresh', async (req, res) => {
  const current = await readCurrentSession(req);
  if (!current) {
    res.status(401).json({ code: 'no_session', message: 'No active session to refresh.' });
    return;
  }

  const { status, body } = await identityClient.refresh({ refreshToken: current.session.refreshToken });

  if (status !== 200) {
    // Reuse-detected (401, whole family revoked) or otherwise unrecoverable — drop the local session too.
    await sessionStore.destroy(current.sessionId);
    res.setHeader('Set-Cookie', serializeClearedSessionCookie());
    res.status(status).json(body);
    return;
  }

  const tokenPair = body as TokenPair;
  const roles = tokenPair.roles ?? current.session.roles;
  await sessionStore.save(current.sessionId, {
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    roles,
  });
  res.json({ authenticated: true, roles });
});

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

bffRouter.post('/auth/password/reset-initiate', async (req, res) => {
  const { status, body } = await identityClient.initiatePasswordReset(req.body);
  res.status(status).json(body ?? {});
});

bffRouter.post('/auth/password/reset-confirm', async (req, res) => {
  const { status, body } = await identityClient.confirmPasswordReset(req.body);
  res.status(status).json(body ?? {});
});

bffRouter.get('/auth/sso/social/:provider/login', (req: Request, res: Response) => {
  const provider = String(req.params['provider']);
  res.redirect(302, identityClient.socialLoginRedirectUrl(provider));
});

bffRouter.get('/auth/sso/social/:provider/callback', async (req: Request, res: Response) => {
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

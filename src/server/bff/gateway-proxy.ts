import { Request, Response, Router } from 'express';

import { DEFAULT_APP_CONFIG } from '../../app/core/config/app-config';
import { logger } from '../logger';
import { readSessionId } from './cookie';
import { sessionStore } from './session-store';

const GATEWAY_BASE_URL = process.env['GATEWAY_BASE_URL'] ?? DEFAULT_APP_CONFIG.gatewayBaseUrl;

/**
 * Hard timeout on every proxied call — at this app's traffic tier, an api-gateway/backend that
 * merely stalls rather than erroring would otherwise hold this Node process's request (and
 * socket) open indefinitely. A generous default since this proxy fronts everything from a cheap
 * cart read to a heavier order-placement call — tune down per-route if a tighter budget is ever
 * needed for a specific path.
 */
const GATEWAY_TIMEOUT_MS = Number(process.env['GATEWAY_TIMEOUT_MS'] ?? 15_000);

/**
 * Token-relay proxy for generated clients whose calls can be authenticated
 * (Cart, Wishlist, Order, User, Notification, Payment — see
 * `core/http/generated-clients.provider.ts`'s BASE_PATH split). This is the
 * one place besides `/api/bff/auth/*` the BFF touches a token: it never
 * hands the token to the browser, it attaches it server-side to the
 * relayed request, exactly like the auth routes already do for
 * identity-service (architecture.md's BFF-pattern rationale, generalized
 * from "auth calls only" to "every call that can carry a session").
 *
 * A request with no active session still proxies through — cart/wishlist
 * reads can be guest-scoped via `X-Guest-Session-Id`, which passes through
 * untouched; the caller-identity requirement (`security.md`'s "route guard
 * is UX, not enforcement") is still the Gateway/service's job, not this
 * proxy's.
 */
export const gatewayProxyRouter = Router();

const FORWARDED_REQUEST_HEADERS = [
  'x-guest-session-id',
  'idempotency-key',
  'if-match',
  'content-type',
  'accept-language',
  'x-kart-locale',
  'x-kart-currency',
] as const;

const FORWARDED_RESPONSE_HEADERS = ['etag', 'content-type', 'location'] as const;

gatewayProxyRouter.use(async (req: Request, res: Response) => {
  const sessionId = readSessionId(req.headers.cookie);
  const session = sessionId ? await sessionStore.get(sessionId) : null;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers[name];
    if (typeof value === 'string') {
      headers.set(name, value);
    }
  }
  if (session) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const upstreamUrl = `${GATEWAY_BASE_URL}${req.originalUrl.replace(/^\/api\/bff\/gateway/, '')}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });

    res.status(upstreamResponse.status);
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstreamResponse.headers.get(name);
      if (value) {
        res.setHeader(name, value);
      }
    }

    if (upstreamResponse.status === 204) {
      res.end();
      return;
    }

    const body = await upstreamResponse.text();
    res.send(body);
  } catch (error) {
    logger.error({ err: error, path: req.originalUrl }, 'Gateway proxy request failed');
    res
      .status(502)
      .json({ code: 'upstream_unavailable', message: 'A dependent service is unavailable.' });
  }
});

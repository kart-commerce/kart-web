import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

import { bffRouter } from './server/bff/routes';
import { gatewayProxyRouter } from './server/bff/gateway-proxy';
import { logger } from './server/logger';

/**
 * WEB-4 — `KART_MOCK=1` (set by `npm run start:mock`) intercepts this process's outbound
 * `fetch`/`http` calls with the same MSW handler set the browser worker uses (`testing/handlers.ts`).
 * Needed because SSR's generated-client calls (category/product/search pages, seo.md's SSR
 * tier) go straight from this Node process to `kart-api-gateway`, never through the browser —
 * without this, `start:mock` would only cover CSR requests.
 */
if (process.env['KART_MOCK'] === '1') {
  const { mockServer } = await import('./testing/server');
  mockServer.listen({ onUnhandledRequest: 'bypass' });
}

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Express's own `trust proxy` setting — governs `req.ip` (used by `rate-limit-middleware.ts` to
 * key login/register/refresh/password-reset throttling per caller). Defaults to `false` (trust
 * nothing, use the literal socket address) rather than guessing a hop count, since trusting a
 * spoofable `X-Forwarded-For` header with no reverse proxy actually in front of this process
 * would let any caller forge their own rate-limit identity for free. Set `TRUST_PROXY` to the
 * number of reverse-proxy hops in front of this process in any real deployment (typically `1`
 * for a single ingress/load balancer) — Express accepts a hop count, `true`/`false`, or a CSV of
 * trusted IPs/subnets, all supported here by passing the env value straight through.
 */
function resolveTrustProxySetting(value: string | undefined): boolean | number | string {
  if (!value) {
    return false;
  }
  if (value === 'true' || value === 'false') {
    return value === 'true';
  }
  const hops = Number(value);
  return Number.isFinite(hops) ? hops : value;
}
app.set('trust proxy', resolveTrustProxySetting(process.env['TRUST_PROXY']));

/**
 * BFF auth/session core (WEB-9) — mounted ahead of the SSR catch-all so
 * `/api/bff/*` never falls through to Angular's router. This is the only
 * place the access/refresh token pair is handled; see server/bff/routes.ts.
 */
app.use(express.json());
app.use('/api/bff', bffRouter);
app.use('/api/bff/gateway', gatewayProxyRouter);

/**
 * Single error-handling boundary for the BFF routes (kart-conventions.md's
 * "one log per exception, never a leaked stack trace" rule, applied here to
 * the Node/Express side) — a downstream failure (e.g. kart-identity-service
 * unreachable) becomes a generic Problem-shaped 502, never Express's default
 * HTML error page with a raw stack trace.
 */
app.use('/api/bff', (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err: error, path: req.path }, 'BFF request failed');
  res.status(502).json({ code: 'upstream_unavailable', message: 'A dependent service is unavailable.' });
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    logger.info({ port }, 'kart-web server listening');
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

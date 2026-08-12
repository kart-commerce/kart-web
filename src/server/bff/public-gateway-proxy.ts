import { Request, Response, Router } from 'express';

import { DEFAULT_APP_CONFIG } from '../../app/core/config/app-config';
import { logger } from '../logger';

const GATEWAY_BASE_URL = process.env['GATEWAY_BASE_URL'] ?? DEFAULT_APP_CONFIG.gatewayBaseUrl;
const GATEWAY_TIMEOUT_MS = Number(process.env['GATEWAY_TIMEOUT_MS'] ?? 15_000);

/**
 * Reverse proxy for the "public, same-origin `/v1` directly" browser call rule
 * `core/http/generated-clients.provider.ts` documents (search/product/category/inventory/etc.) —
 * that comment assumes "a reverse proxy in deployed environments" handles this, mirroring
 * `proxy.conf.json`'s dev-server-only `/v1 -> gateway` rule. No such proxy previously existed in
 * this app's own production Express server (`server.ts`) — every one of those browser calls fell
 * through to the Angular SSR catch-all and 404'd (confirmed live: `GET /v1/categories`,
 * `GET /v1/products/{sku}`). This is that missing reverse proxy, this app's own production
 * equivalent of `proxy.conf.json`. No token/session forwarding — every path behind `/v1` this
 * proxies to is a public, unauthenticated read by contract.
 */
export const publicGatewayProxyRouter = Router();

publicGatewayProxyRouter.use(async (req: Request, res: Response) => {
  const upstreamUrl = `${GATEWAY_BASE_URL}${req.originalUrl}`;

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: req.method,
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });

    res.status(upstreamResponse.status);
    const contentType = upstreamResponse.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }

    if (upstreamResponse.status === 204) {
      res.end();
      return;
    }

    res.send(await upstreamResponse.text());
  } catch (error) {
    logger.error({ err: error, path: req.originalUrl }, 'Public gateway proxy request failed');
    res.status(502).json({ code: 'upstream_unavailable', message: 'A dependent service is unavailable.' });
  }
});

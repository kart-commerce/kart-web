import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { NextFunction, Request, Response } from 'express';
import { join } from 'node:path';

import { bffRouter } from './server/bff/routes';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * BFF auth/session core (WEB-9) — mounted ahead of the SSR catch-all so
 * `/api/bff/*` never falls through to Angular's router. This is the only
 * place the access/refresh token pair is handled; see server/bff/routes.ts.
 */
app.use(express.json());
app.use('/api/bff', bffRouter);

/**
 * Single error-handling boundary for the BFF routes (kart-conventions.md's
 * "one log per exception, never a leaked stack trace" rule, applied here to
 * the Node/Express side) — a downstream failure (e.g. kart-identity-service
 * unreachable) becomes a generic Problem-shaped 502, never Express's default
 * HTML error page with a raw stack trace.
 */
app.use('/api/bff', (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  console.error('BFF request failed', { path: req.path, error });
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

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Node-side counterpart to `browser.ts` — same handler set (api-strategy.md §2's "one handler
 * set, three consumers"). Started from `src/server.ts` when `KART_MOCK=1`, since SSR's
 * generated-client calls go straight to `kart-api-gateway` server-to-server and never pass
 * through the browser's Service Worker at all; without this, `npm run start:mock` would only
 * mock client-side (CSR) requests, leaving every SSR'd page (catalog/product/search) still
 * hitting a real (and, in local dev, likely absent) gateway.
 */
export const mockServer = setupServer(...handlers);

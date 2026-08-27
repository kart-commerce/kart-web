import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/** Started from `main.ts` only when `MSW_ENABLED` is true (the `mock` build configuration — `npm run start:mock`). */
export const worker = setupWorker(...handlers);

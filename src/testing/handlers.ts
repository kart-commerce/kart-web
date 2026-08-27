import { accountHandlers } from '../app/features/account/testing/handlers';
import { cartHandlers } from '../app/features/cart/testing/handlers';
import { catalogHandlers } from '../app/features/catalog/testing/handlers';
import { orderHandlers } from '../app/features/order-tracking/testing/handlers';
import { pricingHandlers } from '../app/features/pricing-promotions/testing/handlers';
import { wishlistHandlers } from '../app/features/wishlist/testing/handlers';

/**
 * api-strategy.md §2 — "one handler set, three consumers" (local dev's `npm run start:mock`,
 * component/unit tests, Storybook — this app has no Storybook of its own, but the handler set
 * is written so `kart-design-system`'s Storybook could still import it directly if it ever
 * needs a live-feeling catalog/cart fixture). Composed per-feature so each feature owns and can
 * evolve its own handlers without this file becoming a merge-conflict magnet.
 */
export const handlers = [
  ...catalogHandlers,
  ...accountHandlers,
  ...cartHandlers,
  ...wishlistHandlers,
  ...orderHandlers,
  ...pricingHandlers,
];

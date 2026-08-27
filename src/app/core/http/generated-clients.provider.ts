import { PLATFORM_ID, Provider, inject } from '@angular/core';
import { isPlatformServer } from '@angular/common';

import { APP_CONFIG } from '../config/app-config';
import { BASE_PATH as CART_BASE_PATH } from './generated/cart/v1/variables';
import { BASE_PATH as CATEGORY_BASE_PATH } from './generated/category/v1/variables';
import { BASE_PATH as DELIVERY_TRACKING_BASE_PATH } from './generated/delivery-tracking/v1/variables';
import { BASE_PATH as IDENTITY_BASE_PATH } from './generated/identity/v1/variables';
import { BASE_PATH as INVENTORY_BASE_PATH } from './generated/inventory/v1/variables';
import { BASE_PATH as NOTIFICATION_BASE_PATH } from './generated/notification/v1/variables';
import { BASE_PATH as OFFER_BASE_PATH } from './generated/offer/v1/variables';
import { BASE_PATH as ORDER_BASE_PATH } from './generated/order/v1/variables';
import { BASE_PATH as PAYMENT_BASE_PATH } from './generated/payment/v1/variables';
import { BASE_PATH as PRODUCT_BASE_PATH } from './generated/product/v1/variables';
import { BASE_PATH as RECOMMENDATION_BASE_PATH } from './generated/recommendation/v1/variables';
import { BASE_PATH as REVIEW_BASE_PATH } from './generated/review/v1/variables';
import { BASE_PATH as SEARCH_BASE_PATH } from './generated/search/v1/variables';
import { BASE_PATH as SHIPPING_BASE_PATH } from './generated/shipping/v1/variables';
import { BASE_PATH as USER_BASE_PATH } from './generated/user/v1/variables';
import { BASE_PATH as WISHLIST_BASE_PATH } from './generated/wishlist/v1/variables';

/**
 * One BASE_PATH provider per generated client (WEB-3) — every consumed service from
 * api-integration-map.md gets a server-vs-browser base-URL rule: the SSR server always
 * calls kart-api-gateway directly (server-to-server, no CORS). The browser branch splits
 * in two:
 *
 * - **Public/anonymous** services (catalog browsing — nothing here is ever caller-scoped)
 *   call same-origin `/v1` directly, proxied to the gateway by proxy.conf.json in dev / a
 *   reverse proxy in deployed environments — the same rule the category client already
 *   established.
 * - **Auth-capable** services (cart, wishlist, order, user, notification, payment — every
 *   one whose api-contract.yaml has an endpoint that can be called by a logged-in user, not
 *   only a guest) call same-origin `/api/bff/gateway/v1` instead: the BFF's token-relay
 *   proxy (`server/bff/gateway-proxy.ts`) attaches the session's bearer token server-side,
 *   since the browser itself never holds one (security.md's BFF pattern). This never needs
 *   solving for SSR because every page these services back is CSR-only per seo.md's page
 *   classification (cart/checkout/account/wishlist/orders) — SSR never calls them.
 *
 * `kart-identity-service`'s generated client is provided too, even though today's actual
 * login/register/MFA/password-reset calls go through the BFF's own hand-written
 * `server/bff/identity-client.ts` (never through the browser, per the BFF pattern) — this
 * token exists so the BFF layer or any future server-side Angular-context caller has the
 * same typed client available, without inventing a second generation pipeline for it later.
 *
 * **`/v1`-suffix split**: most services' own `api-contract.yaml` already embeds `v1` in
 * every path (`/v1/products/{sku}`, generated as `${basePath}/v1/products/...`); a `BASE_PATH`
 * of `/v1` or `/api/bff/gateway/v1` for those would double up to `/v1/v1/...` and 404.
 * `kart-category-service`, `kart-wishlist-service`, `kart-identity-service`, and
 * `kart-inventory-service` are the exception — their contracts omit the version from the
 * path itself, so `BASE_PATH` has to supply the `/v1` segment for those four. This mirrors
 * the same inconsistency across contracts noted for the OpenAPI-generation step (WEB-3) —
 * not something fixable from this repo, only worked around here.
 */
const CONTRACT_PATH_INCLUDES_V1 = new Set([
  CART_BASE_PATH,
  DELIVERY_TRACKING_BASE_PATH,
  NOTIFICATION_BASE_PATH,
  OFFER_BASE_PATH,
  ORDER_BASE_PATH,
  PAYMENT_BASE_PATH,
  PRODUCT_BASE_PATH,
  RECOMMENDATION_BASE_PATH,
  REVIEW_BASE_PATH,
  SEARCH_BASE_PATH,
  SHIPPING_BASE_PATH,
  USER_BASE_PATH,
]);

export function provideGeneratedApiClients(): Provider[] {
  const publicTokens = [
    CATEGORY_BASE_PATH,
    DELIVERY_TRACKING_BASE_PATH,
    IDENTITY_BASE_PATH,
    INVENTORY_BASE_PATH,
    OFFER_BASE_PATH,
    PRODUCT_BASE_PATH,
    RECOMMENDATION_BASE_PATH,
    REVIEW_BASE_PATH,
    SEARCH_BASE_PATH,
    SHIPPING_BASE_PATH,
  ];

  const authCapableTokens = [
    CART_BASE_PATH,
    NOTIFICATION_BASE_PATH,
    ORDER_BASE_PATH,
    PAYMENT_BASE_PATH,
    USER_BASE_PATH,
    WISHLIST_BASE_PATH,
  ];

  const v1Suffix = (token: (typeof publicTokens)[number]) => (CONTRACT_PATH_INCLUDES_V1.has(token) ? '' : '/v1');

  return [
    ...publicTokens.map((token) => ({
      provide: token,
      useFactory: () =>
        isPlatformServer(inject(PLATFORM_ID))
          ? `${inject(APP_CONFIG).gatewayBaseUrl}${v1Suffix(token)}`
          : v1Suffix(token), // '' is a valid same-origin base — the contract's own path already starts with `/v1/...`
    })),
    ...authCapableTokens.map((token) => ({
      provide: token,
      useFactory: () =>
        isPlatformServer(inject(PLATFORM_ID))
          ? `${inject(APP_CONFIG).gatewayBaseUrl}${v1Suffix(token)}`
          : `/api/bff/gateway${v1Suffix(token)}`,
    })),
  ];
}

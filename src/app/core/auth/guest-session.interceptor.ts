import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { GuestSessionService } from './guest-session.service';

/**
 * Attaches `X-Guest-Session-Id` to every outgoing request — kart-cart-service's
 * (and kart-wishlist-service's) `guestSessionAuth` scheme falls back to this header
 * whenever no `Authorization` bearer token is present (an unauthenticated visitor).
 * Harmless to attach on authenticated requests too — those services resolve the
 * JWT `sub` claim first and only fall back to this header when absent.
 * No-op on the server (`GuestSessionService.getOrCreateId()` returns `undefined`
 * there) — cart/wishlist/checkout are CSR-only routes, SSR never calls them.
 */
export const guestSessionInterceptor: HttpInterceptorFn = (req, next) => {
  const guestSession = inject(GuestSessionService);
  const guestSessionId = guestSession.getOrCreateId();

  if (!guestSessionId) {
    return next(req);
  }

  return next(req.clone({ setHeaders: { 'X-Guest-Session-Id': guestSessionId } }));
};

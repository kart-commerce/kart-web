import { HttpResponse, http } from 'msw';

import { FIXTURE_WISHLIST } from '../../../../testing/fixtures/wishlist.fixtures';

/** WEB-4 — MSW handlers for kart-wishlist-service. Standing ready for `WishlistService`'s eventual migration off its in-memory mock. */
let wishlist = [...FIXTURE_WISHLIST];

export const wishlistHandlers = [
  http.get('*/wishlist', () => HttpResponse.json({ items: wishlist })),

  http.post('*/wishlist', async ({ request }) => {
    const body = (await request.json()) as { sku: string; referencePrice: number };
    const entry = { sku: body.sku, referencePrice: body.referencePrice, status: 'active' as const, addedAt: new Date().toISOString() };
    wishlist = [...wishlist.filter((item) => item.sku !== body.sku), entry];
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.delete('*/wishlist/:sku', ({ params }) => {
    wishlist = wishlist.filter((item) => item.sku !== params['sku']);
    return new HttpResponse(null, { status: 204 });
  }),
];

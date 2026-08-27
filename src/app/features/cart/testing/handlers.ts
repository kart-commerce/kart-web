import { HttpResponse, http } from 'msw';

import { FIXTURE_CART } from '../../../../testing/fixtures/cart.fixtures';

/** WEB-4 — MSW handlers for kart-cart-service. Not yet consumed at runtime (`CartService` is still the in-memory `mock-now/generated-client-later` implementation noted in cart.service.ts) — this stands ready for that migration. */
let cart = structuredClone(FIXTURE_CART);

export const cartHandlers = [
  http.get('*/v1/cart', () => HttpResponse.json(cart)),

  http.post('*/v1/cart/items', async ({ request }) => {
    const body = (await request.json()) as { sku: string; quantity: number };
    const existing = cart.items.find((item) => item.sku === body.sku);
    cart = {
      ...cart,
      items: existing
        ? cart.items.map((item) => (item.sku === body.sku ? { ...item, quantity: item.quantity + body.quantity } : item))
        : [...cart.items, { sku: body.sku, quantity: body.quantity, availability: 'Available' }],
    };
    return HttpResponse.json(cart, { status: 201 });
  }),

  http.patch('*/v1/cart/items/:sku', async ({ request, params }) => {
    const body = (await request.json()) as { quantity: number };
    cart = {
      ...cart,
      items: cart.items.map((item) => (item.sku === params['sku'] ? { ...item, quantity: body.quantity } : item)),
    };
    return HttpResponse.json(cart);
  }),

  http.delete('*/v1/cart/items/:sku', ({ params }) => {
    cart = { ...cart, items: cart.items.filter((item) => item.sku !== params['sku']) };
    return HttpResponse.json(cart);
  }),

  http.post('*/v1/cart/merge', () => HttpResponse.json(cart)),

  http.post('*/v1/cart/checkout', () => HttpResponse.json({ ...cart, status: 'CheckedOut' })),
];

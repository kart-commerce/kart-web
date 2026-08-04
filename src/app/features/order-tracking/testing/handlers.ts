import { HttpResponse, http } from 'msw';

import { FIXTURE_ORDERS } from '../../../../testing/fixtures/order.fixtures';

/**
 * WEB-4 — MSW handlers for kart-order-service. Standing ready for `OrderService`'s eventual
 * migration off its in-memory mock (order.service.ts's own "mock-now" note).
 *
 * kart-order-service's published `api-contract.yaml` has no "list orders for the current user"
 * operation — only `createOrder`/`getOrder`/`cancelOrder`/`resolveFulfillmentException`, each
 * keyed by a single known `orderId`. There is therefore no real endpoint to mock for order
 * *history* listing; this is a genuine contract gap (flagged in the final acceptance report),
 * not something this handler set can paper over with an invented route.
 */
let orders = structuredClone([...FIXTURE_ORDERS]);

export const orderHandlers = [
  http.get('*/v1/orders/:id', ({ params }) => {
    const order = orders.find((item) => item.orderId === params['id']);
    return order
      ? HttpResponse.json(order)
      : HttpResponse.json({ code: 'not_found', message: 'Order not found' }, { status: 404 });
  }),

  http.post('*/v1/orders', async ({ request }) => {
    const body = (await request.json()) as { items: { sku: string; qty: number }[] };
    const created = {
      orderId: `ord-${orders.length + 1}`,
      userId: orders[0]?.userId ?? 'usr-fixture-001',
      status: 'Created' as const,
      items: body.items.map((item) => ({ sku: item.sku, qty: item.qty, unitPrice: { amount: 0, currency: 'USD' } })),
      totalAmount: { amount: 0, currency: 'USD' },
      createdAt: '2026-08-04T00:00:00.000Z',
    };
    orders = [...orders, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  http.post('*/v1/orders/:id/cancel', ({ params }) => {
    const order = orders.find((item) => item.orderId === params['id']);
    if (!order) {
      return HttpResponse.json({ code: 'not_found', message: 'Order not found' }, { status: 404 });
    }
    orders = orders.map((item) => (item.orderId === params['id'] ? { ...item, status: 'Cancelled' as const } : item));
    return HttpResponse.json({ ...order, status: 'Cancelled' });
  }),
];

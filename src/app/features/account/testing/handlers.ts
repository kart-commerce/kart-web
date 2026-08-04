import { HttpResponse, http } from 'msw';

import { FIXTURE_USER_PROFILE } from '../../../../testing/fixtures/user.fixtures';

/** WEB-4 — MSW handlers for kart-user-service (profile/address/preferences), the real generated-client consumer for WEB-44. */
let profile = structuredClone(FIXTURE_USER_PROFILE);

export const accountHandlers = [
  http.get('*/v1/users/:userId', ({ params }) => {
    if (params['userId'] !== profile.userId) {
      return HttpResponse.json({ code: 'not_found', message: 'User not found' }, { status: 404 });
    }
    return HttpResponse.json(profile);
  }),

  http.patch('*/v1/users/:userId', async ({ request }) => {
    const body = (await request.json()) as { preferences?: Record<string, unknown> };
    profile = { ...profile, preferences: { ...profile.preferences, ...body.preferences } };
    return HttpResponse.json(profile);
  }),

  http.post('*/v1/users/:userId/addresses', async ({ request }) => {
    const input = (await request.json()) as Omit<(typeof profile.addresses)[number], 'addressId'>;
    const created = { ...input, addressId: `addr-${profile.addresses.length + 1}` };
    profile = { ...profile, addresses: [...profile.addresses, created] };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.patch('*/v1/users/:userId/addresses/:addressId', async ({ request, params }) => {
    const input = (await request.json()) as Partial<(typeof profile.addresses)[number]>;
    const updated = { ...profile.addresses.find((a) => a.addressId === params['addressId']), ...input };
    profile = {
      ...profile,
      addresses: profile.addresses.map((a) => (a.addressId === params['addressId'] ? (updated as typeof a) : a)),
    };
    return HttpResponse.json(updated);
  }),

  http.delete('*/v1/users/:userId/addresses/:addressId', ({ params }) => {
    profile = { ...profile, addresses: profile.addresses.filter((a) => a.addressId !== params['addressId']) };
    return new HttpResponse(null, { status: 204 });
  }),
];

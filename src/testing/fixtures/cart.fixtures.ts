import { CartResponse } from '../../app/core/http/generated/cart/v1/model/cartResponse';

export const FIXTURE_CART: CartResponse = {
  cartId: 'cart-fixture-001',
  ownerType: 'Guest',
  status: 'Active',
  items: [
    { sku: 'PHN-AURA-256-BLK', quantity: 1, availability: 'Available' },
    { sku: 'AUD-PULSE-BUD-WHT', quantity: 2, availability: 'Available' },
  ],
};

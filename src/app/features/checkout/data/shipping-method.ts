import { Money } from '../../../shared/util/money';

export interface ShippingMethod {
  readonly id: string;
  readonly label: string;
  readonly etaDays: string;
  readonly price: Money;
}

/** Stands in for kart-shipping-service's shipping-options read — see mock-catalog.ts's note. */
export const MOCK_SHIPPING_METHODS: readonly ShippingMethod[] = [
  { id: 'standard', label: 'Standard shipping', etaDays: '5-7 business days', price: { amount: 0, currency: 'USD' } },
  { id: 'express', label: 'Express shipping', etaDays: '2 business days', price: { amount: 15, currency: 'USD' } },
];

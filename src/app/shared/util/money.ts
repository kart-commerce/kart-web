/** Monetary amount as returned by kart-offer-service's pricing/quote contract: decimal major-unit amount + ISO currency code. */
export interface Money {
  readonly amount: number;
  readonly currency: string;
}

export function addMoney(a: Money, b: Money): Money {
  return { amount: a.amount + b.amount, currency: a.currency };
}

export function multiplyMoney(money: Money, factor: number): Money {
  return { amount: money.amount * factor, currency: money.currency };
}

export function subtractMoney(a: Money, b: Money): Money {
  return { amount: a.amount - b.amount, currency: a.currency };
}

export const ZERO_USD: Money = { amount: 0, currency: 'USD' };

export type SupportedCurrency = 'USD' | 'BDT';

export const SUPPORTED_CURRENCIES: readonly SupportedCurrency[] = ['USD', 'BDT'];
export const DEFAULT_CURRENCY: SupportedCurrency = 'USD';

export function isSupportedCurrency(value: string | null | undefined): value is SupportedCurrency {
  return !!value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

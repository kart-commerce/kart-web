import { Pipe, PipeTransform, inject } from '@angular/core';

import { LocaleService } from '../../core/i18n/locale.service';
import { SupportedLocale } from '../../core/i18n/locale';
import { Money } from './money';

/**
 * `Intl.NumberFormat` locale tag per active display locale (localization.md §7/§8) — `bn` forces
 * the Latin numbering system (`-u-nu-latn`) per §6's deliberate numeral-script decision: Bangla
 * strings are fully translated, but numbers/dates/currency always render in Latin digits, never
 * Bengali glyphs (০–৯), for e-commerce scanning-speed reasons.
 */
const INTL_LOCALE_TAGS: Readonly<Record<SupportedLocale, string>> = {
  en: 'en-US',
  de: 'de-DE',
  bn: 'bn-BD-u-nu-latn',
};

@Pipe({ name: 'kartMoney', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly localeService = inject(LocaleService);

  transform(money: Money | null | undefined): string {
    if (!money) {
      return '';
    }
    const localeTag = INTL_LOCALE_TAGS[this.localeService.activeLocale()];
    return new Intl.NumberFormat(localeTag, { style: 'currency', currency: money.currency }).format(
      money.amount,
    );
  }
}

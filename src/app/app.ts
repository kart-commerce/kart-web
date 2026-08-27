import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AccessTokenRefreshSchedulerService } from './core/auth/access-token-refresh-scheduler.service';
import { AuthService } from './core/auth/auth.service';
import { LocaleService } from './core/i18n/locale.service';
import { LOCALE_DIRECTION } from './core/i18n/locale';
import { CategoryNav } from './features/catalog/category-nav/category-nav';
import { SearchBar } from './features/catalog/search-bar/search-bar';
import { CartIndicator } from './features/cart/cart-indicator/cart-indicator';
import { WishlistIndicator } from './features/wishlist/wishlist-indicator/wishlist-indicator';
import { LocaleCurrencySwitcher } from './features/account/locale-currency-switcher/locale-currency-switcher';
import { CompareBar } from './features/catalog/compare-bar/compare-bar';
import { NotificationBell } from './features/notifications/notification-bell/notification-bell';
import { ToastHost } from './features/notifications/toast-host/toast-host';
import { CookieConsentBanner } from './core/consent/cookie-consent-banner/cookie-consent-banner';
import { Logo, ThemeToggle } from './shared/ui';

@Component({
  selector: 'kart-root',
  imports: [
    RouterOutlet,
    RouterLink,
    CategoryNav,
    SearchBar,
    CartIndicator,
    WishlistIndicator,
    LocaleCurrencySwitcher,
    NotificationBell,
    ToastHost,
    CompareBar,
    CookieConsentBanner,
    Logo,
    ThemeToggle,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly authService = inject(AuthService);
  protected readonly currentYear = new Date().getFullYear();
  private readonly localeService = inject(LocaleService);
  private readonly document = inject(DOCUMENT);
  /** Constructing this singleton starts its constructor `effect()` (same pattern kart-admin-web uses) — see its own doc comment for why proactive refresh belongs here. */
  private readonly accessTokenRefreshScheduler = inject(AccessTokenRefreshSchedulerService);

  constructor() {
    this.authService.loadSession().subscribe();

    // seo.md/localization.md: `lang`/`dir` reflect the active locale everywhere, including SSR's
    // first response — RTL is structurally ready (design-tokens.md's logical-properties mandate)
    // even though no launch locale is RTL yet (LOCALE_DIRECTION).
    effect(() => {
      const locale = this.localeService.activeLocale();
      this.document.documentElement.lang = locale;
      this.document.documentElement.dir = LOCALE_DIRECTION[locale];
    });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}

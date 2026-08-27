import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Alert, Button, Card } from '../../../shared/ui';
import { CurrencyService } from '../../../core/i18n/currency.service';
import { isSupportedCurrency } from '../../../core/i18n/currency';
import { LocaleService } from '../../../core/i18n/locale.service';
import { SupportedLocale } from '../../../core/i18n/locale';
import { UserProfileService } from '../data/user-profile.service';
import { UserProfileResponse } from '../../../core/http/generated/user/v1/model/userProfileResponse';

/**
 * WEB-45 — dedicated notification preference center, split out of profile-page's single
 * do-everything form. kart-user-service's `UpdateUserPreferences` is a whole-object replace,
 * not a field-level merge (UserProfile.cs `UpdatePreferences` — "last-write-wins", not a
 * per-field PATCH), so this page must always resubmit the full `Preferences` object —
 * `locale`/`currency` are carried through unedited from whatever was last loaded here, exactly
 * as profile-page does for its own unedited notification/marketing fields. Neither page can
 * safely omit the other's fields from its own save request.
 */
@Component({
  selector: 'kart-notifications-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, Card],
  templateUrl: './notifications-page.html',
  styleUrl: './notifications-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly userProfileService = inject(UserProfileService);
  private readonly localeService = inject(LocaleService);
  private readonly currencyService = inject(CurrencyService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly profile = signal<UserProfileResponse | undefined>(undefined);

  /** `locale`/`currency` are not rendered on this page — carried through unedited so a save here never resets what profile-page owns. */
  private currentLocale: SupportedLocale = 'en';
  private currentCurrency = 'USD';

  readonly preferencesForm = this.formBuilder.group({
    notifyEmail: [true],
    notifySms: [false],
    notifyPush: [false],
    marketingConsent: [false],
  });

  constructor() {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.userProfileService.getProfile().subscribe({
      next: (profile) => {
        this.loading.set(false);
        this.profile.set(profile);
        if (!profile) {
          this.loadError.set('Could not load your notification preferences.');
          return;
        }
        const preferences = profile.preferences;
        this.currentLocale = (preferences.locale?.split('-')[0] as SupportedLocale) ?? this.localeService.activeLocale();
        this.currentCurrency = isSupportedCurrency(preferences.currency) ? preferences.currency : this.currencyService.activeCurrency();
        this.preferencesForm.patchValue({
          notifyEmail: preferences.notificationOptIn?.email ?? true,
          notifySms: preferences.notificationOptIn?.sms ?? false,
          notifyPush: preferences.notificationOptIn?.push ?? false,
          marketingConsent: preferences.marketingConsent ?? false,
        });
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Could not load your notification preferences.');
      },
    });
  }

  save(): void {
    if (this.preferencesForm.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    const value = this.preferencesForm.getRawValue();

    this.userProfileService
      .updatePreferences({
        preferences: {
          // Whole-object replace — always resubmit the locale/currency this page loaded,
          // never omit them, or a save here would reset profile-page's settings to defaults.
          locale: this.currentLocale,
          currency: this.currentCurrency,
          notificationOptIn: { email: value.notifyEmail, sms: value.notifySms, push: value.notifyPush },
          marketingConsent: value.marketingConsent,
        },
      })
      .subscribe(() => {
        this.saving.set(false);
        this.saved.set(true);
      });
  }
}

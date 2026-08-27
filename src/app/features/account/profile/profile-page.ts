import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Alert, Button, Card, FormField, KartInput } from '../../../shared/ui';
import { CurrencyService } from '../../../core/i18n/currency.service';
import { SUPPORTED_CURRENCIES, isSupportedCurrency } from '../../../core/i18n/currency';
import { LocaleService } from '../../../core/i18n/locale.service';
import { LOCALE_LABELS, SUPPORTED_LOCALES, SupportedLocale } from '../../../core/i18n/locale';
import { UserProfileService } from '../data/user-profile.service';
import { AddressInput } from '../../../core/http/generated/user/v1/model/addressInput';
import { UserProfileResponse } from '../../../core/http/generated/user/v1/model/userProfileResponse';
import { AddressBook } from '../address-book/address-book';

/**
 * WEB-44 — profile / address / preference management, consuming kart-user-service's already
 * approved GetUserProfile/AddAddress/UpdateAddress/RemoveAddress/UpdateUserPreferences
 * endpoints for real (via `UserProfileService`/the generated client), not a mock.
 */
@Component({
  selector: 'kart-profile-page',
  imports: [ReactiveFormsModule, RouterLink, Alert, Button, Card, FormField, KartInput, AddressBook],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  private readonly userProfileService = inject(UserProfileService);
  private readonly localeService = inject(LocaleService);
  private readonly currencyService = inject(CurrencyService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly locales = SUPPORTED_LOCALES;
  protected readonly localeLabels = LOCALE_LABELS;
  protected readonly currencies = SUPPORTED_CURRENCIES;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly saved = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly profile = signal<UserProfileResponse | undefined>(undefined);

  readonly preferencesForm = this.formBuilder.group({
    locale: ['en' as SupportedLocale, Validators.required],
    currency: ['USD', Validators.required],
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
          this.loadError.set('Could not load your profile.');
          return;
        }
        const preferences = profile.preferences;
        this.preferencesForm.patchValue({
          locale: (preferences.locale?.split('-')[0] as SupportedLocale) ?? this.localeService.activeLocale(),
          currency: isSupportedCurrency(preferences.currency)
            ? preferences.currency
            : this.currencyService.activeCurrency(),
          notifyEmail: preferences.notificationOptIn?.email ?? true,
          notifySms: preferences.notificationOptIn?.sms ?? false,
          notifyPush: preferences.notificationOptIn?.push ?? false,
          marketingConsent: preferences.marketingConsent ?? false,
        });
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set('Could not load your profile.');
      },
    });
  }

  savePreferences(): void {
    if (this.preferencesForm.invalid || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saved.set(false);
    const value = this.preferencesForm.getRawValue();

    this.userProfileService
      .updatePreferences({
        preferences: {
          locale: value.locale,
          currency: value.currency,
          notificationOptIn: { email: value.notifyEmail, sms: value.notifySms, push: value.notifyPush },
          marketingConsent: value.marketingConsent,
        },
      })
      .subscribe(() => {
        this.saving.set(false);
        this.saved.set(true);
        // The account is now the source of truth for locale/currency — apply immediately,
        // same as a guest's own explicit switcher action (localization.md §2/§3).
        this.localeService.setLocale(value.locale);
        this.currencyService.setCurrency(value.currency as never);
      });
  }

  addAddress(input: AddressInput): void {
    this.userProfileService.addAddress(input).subscribe(() => this.refresh());
  }

  updateAddress(event: { addressId: string; input: AddressInput }): void {
    this.userProfileService.updateAddress(event.addressId, event.input).subscribe(() => this.refresh());
  }

  removeAddress(addressId: string): void {
    this.userProfileService.removeAddress(addressId).subscribe(() => this.refresh());
  }
}

import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { DefaultService as UserApi } from '../../../core/http/generated/user/v1';
import { Address as UserServiceAddress } from '../../../core/http/generated/user/v1/model/address';
import { Address, AddressInput } from './models';

/**
 * Real kart-user-service (`GET .../addresses` via `getUserProfile`, `POST/PATCH/DELETE
 * .../addresses`). kart-user-service's `Address` has no recipient-name field at all (only
 * type/line1/line2/city/region/postalCode/countryCode/phone/isDefault) — a real, pre-existing
 * backend gap, not something to redesign here. `fullName` is therefore kept session-local only
 * (this Map, never persisted) so the existing address-form UX doesn't need to change shape;
 * `region`/`countryCode` are the real field names this app's own `state`/`country` map onto.
 */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly authService = inject(AuthService);
  private readonly userApi = inject(UserApi);
  private readonly fullNameBySessionOnly = new Map<string, string>();

  private readonly items = signal<readonly Address[]>([]);

  readonly addresses = this.items.asReadonly();
  readonly defaultAddress = computed(() => this.items().find((address) => address.isDefault) ?? this.items()[0]);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.refresh().subscribe();
    }
  }

  add(input: AddressInput): Observable<Address> {
    const userId = this.requireUserId();

    return this.userApi.addAddress(userId, toAddressInput(input)).pipe(
      tap((response) => this.fullNameBySessionOnly.set(response.addressId, input.fullName)),
      map((response) => toAddress(response, input.fullName)),
      tap((address) => this.items.update((current) => [...current, address])),
    );
  }

  remove(addressId: string): void {
    const userId = this.requireUserId();
    this.userApi.removeAddress(userId, addressId).subscribe(() => {
      this.fullNameBySessionOnly.delete(addressId);
      this.items.update((current) => current.filter((address) => address.addressId !== addressId));
    });
  }

  setDefault(addressId: string): void {
    const userId = this.requireUserId();
    const current = this.items().find((address) => address.addressId === addressId);
    if (!current) {
      return;
    }
    this.userApi.updateAddress(userId, addressId, { ...toAddressInput(current), isDefault: true }).subscribe(() => {
      this.items.update((list) => list.map((address) => ({ ...address, isDefault: address.addressId === addressId })));
    });
  }

  private refresh() {
    const userId = this.authService.session()?.userId;
    if (!userId) {
      return of(undefined);
    }
    return this.userApi.getUserProfile(userId).pipe(
      map((profile) => profile.addresses.map((a) => toAddress(a, this.fullNameBySessionOnly.get(a.addressId) ?? profile.displayName ?? ''))),
      tap((addresses) => this.items.set(addresses)),
      catchError(() => of(undefined)),
    );
  }

  private requireUserId(): string {
    const userId = this.authService.session()?.userId;
    if (!userId) {
      throw new Error('AddressService requires an authenticated session.');
    }
    return userId;
  }
}

function toAddressInput(input: AddressInput | Address): { type: 'Shipping'; line1: string; line2?: string; city: string; region: string; postalCode: string; countryCode: string; phone: string; isDefault?: boolean } {
  return {
    type: 'Shipping',
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    region: input.state,
    postalCode: input.postalCode,
    countryCode: input.country,
    phone: input.phone,
    isDefault: 'isDefault' in input ? input.isDefault : undefined,
  };
}

function toAddress(response: UserServiceAddress, fullName: string): Address {
  return {
    addressId: response.addressId,
    fullName,
    line1: response.line1,
    line2: response.line2,
    city: response.city,
    state: response.region ?? '',
    postalCode: response.postalCode,
    country: response.countryCode,
    phone: response.phone ?? '',
    isDefault: response.isDefault,
  };
}

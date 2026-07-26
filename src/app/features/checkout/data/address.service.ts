import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';

import { Address, AddressInput } from './models';

const STORAGE_KEY = 'kart-addresses-v1';

/** Stands in for kart-user-service's `GET/POST /v1/users/{userId}/addresses` — see mock-catalog.ts's note. */
@Injectable({ providedIn: 'root' })
export class AddressService {
  private readonly platformId = inject(PLATFORM_ID);

  private readonly items = signal<readonly Address[]>(this.readFromStorage());

  readonly addresses = this.items.asReadonly();
  readonly defaultAddress = computed(() => this.items().find((address) => address.isDefault) ?? this.items()[0]);

  constructor() {
    effect(() => this.writeToStorage(this.items()));
  }

  add(input: AddressInput): Address {
    const address: Address = {
      ...input,
      addressId: crypto.randomUUID(),
      isDefault: this.items().length === 0,
    };
    this.items.update((current) => [...current, address]);
    return address;
  }

  remove(addressId: string): void {
    this.items.update((current) => current.filter((address) => address.addressId !== addressId));
  }

  setDefault(addressId: string): void {
    this.items.update((current) =>
      current.map((address) => ({ ...address, isDefault: address.addressId === addressId })),
    );
  }

  private readFromStorage(): readonly Address[] {
    if (!isPlatformBrowser(this.platformId)) {
      return [];
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Address[]) : [];
    } catch {
      return [];
    }
  }

  private writeToStorage(items: readonly Address[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }
}

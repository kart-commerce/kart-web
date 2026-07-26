/** `GET/POST /v1/users/{userId}/addresses` shape (kart-user-service). */
export interface Address {
  readonly addressId: string;
  readonly fullName: string;
  readonly line1: string;
  readonly line2?: string;
  readonly city: string;
  readonly state: string;
  readonly postalCode: string;
  readonly country: string;
  readonly phone: string;
  readonly isDefault: boolean;
}

export type AddressInput = Omit<Address, 'addressId' | 'isDefault'>;

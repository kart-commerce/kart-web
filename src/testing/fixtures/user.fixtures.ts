import { Address } from '../../app/core/http/generated/user/v1/model/address';
import { UserProfileResponse } from '../../app/core/http/generated/user/v1/model/userProfileResponse';

export const FIXTURE_ADDRESSES: readonly Address[] = [
  {
    addressId: 'addr-home-001',
    type: 'Shipping',
    line1: '221B Baker Street',
    city: 'London',
    postalCode: 'NW1 6XE',
    countryCode: 'GB',
    isDefault: true,
  },
];

export const FIXTURE_USER_PROFILE: UserProfileResponse = {
  userId: 'usr-fixture-001',
  email: 'jordan.morgan@example.com',
  displayName: 'Jordan Morgan',
  addresses: [...FIXTURE_ADDRESSES],
  preferences: { locale: 'en', currency: 'USD', marketingConsent: false },
  appInstalled: false,
};

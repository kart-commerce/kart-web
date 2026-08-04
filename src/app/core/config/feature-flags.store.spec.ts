import { TestBed } from '@angular/core/testing';

import { FeatureFlagsStore } from './feature-flags.store';

describe('FeatureFlagsStore', () => {
  let store: FeatureFlagsStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(FeatureFlagsStore);
  });

  it('defaults every flag to its DEFAULT_FEATURE_FLAGS value', () => {
    expect(store.isEnabled('ff-return-request-order-service')).toBeFalse();
    expect(store.isEnabled('ff-gdpr-export-user-service')).toBeFalse();
  });

  it('reflects flags set via setFlags', () => {
    store.setFlags({
      'ff-return-request-order-service': true,
      'ff-gdpr-export-user-service': false,
    });

    expect(store.isEnabled('ff-return-request-order-service')).toBeTrue();
    expect(store.isEnabled('ff-gdpr-export-user-service')).toBeFalse();
  });
});

import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { UserProfileService } from '../data/user-profile.service';
import { UserProfileResponse } from '../../../core/http/generated/user/v1/model/userProfileResponse';
import { UpdateUserPreferencesRequest } from '../../../core/http/generated/user/v1/model/updateUserPreferencesRequest';
import { NotificationsPage } from './notifications-page';

function profile(overrides: Partial<UserProfileResponse> = {}): UserProfileResponse {
  return {
    userId: 'user-1',
    addresses: [],
    preferences: {
      locale: 'en',
      currency: 'USD',
      notificationOptIn: { email: true, sms: false, push: false },
      marketingConsent: false,
    },
    ...overrides,
  };
}

describe('NotificationsPage', () => {
  let userProfileServiceSpy: jasmine.SpyObj<Pick<UserProfileService, 'getProfile' | 'updatePreferences'>>;

  // No default value here on purpose: a default parameter only applies when the caller passes
  // `undefined` literally, which is exactly the "profile failed to load" case this spec needs to
  // express explicitly — a default would silently swap it back to a loaded profile.
  function configure(loaded: UserProfileResponse | undefined) {
    userProfileServiceSpy = jasmine.createSpyObj('UserProfileService', ['getProfile', 'updatePreferences']);
    userProfileServiceSpy.getProfile.and.returnValue(of(loaded));
    userProfileServiceSpy.updatePreferences.and.returnValue(of(loaded));

    TestBed.configureTestingModule({
      imports: [NotificationsPage],
      providers: [provideRouter([]), { provide: UserProfileService, useValue: userProfileServiceSpy }],
    });
  }

  it('patches the form from the loaded profile', () => {
    configure(profile({ preferences: { locale: 'en', currency: 'USD', notificationOptIn: { email: false, sms: true, push: true }, marketingConsent: true } }));
    const fixture = TestBed.createComponent(NotificationsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.preferencesForm.getRawValue()).toEqual({
      notifyEmail: false,
      notifySms: true,
      notifyPush: true,
      marketingConsent: true,
    });
  });

  it('shows a load error when the profile fails to load', () => {
    configure(undefined);
    const fixture = TestBed.createComponent(NotificationsPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.loadError()).not.toBeNull();
  });

  it('save() resubmits the whole preferences object, carrying locale/currency through unedited', () => {
    configure(profile({ preferences: { locale: 'bn', currency: 'BDT', notificationOptIn: { email: true, sms: false, push: false }, marketingConsent: false } }));
    const fixture = TestBed.createComponent(NotificationsPage);
    fixture.detectChanges();

    fixture.componentInstance.preferencesForm.patchValue({ notifySms: true, marketingConsent: true });
    fixture.componentInstance.save();

    const request: UpdateUserPreferencesRequest = userProfileServiceSpy.updatePreferences.calls.mostRecent().args[0];
    expect(request.preferences).toEqual({
      locale: 'bn',
      currency: 'BDT',
      notificationOptIn: { email: true, sms: true, push: false },
      marketingConsent: true,
    });
  });

  it('sets saved() to true after a successful save', () => {
    configure(profile());
    const fixture = TestBed.createComponent(NotificationsPage);
    fixture.detectChanges();

    fixture.componentInstance.save();

    expect(fixture.componentInstance.saved()).toBe(true);
  });
});

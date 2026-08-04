import { Injectable, inject } from '@angular/core';
import { Observable, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { DefaultService } from '../../../core/http/generated/user/v1/api/default.service';
import {
  Address,
  AddressInput,
  UpdateUserPreferencesRequest,
  UserProfileResponse,
} from '../../../core/http/generated/user/v1/model/models';

/**
 * WEB-44 — thin wrapper over the generated `kart-user-service` client
 * (core/http/generated/user/v1), resolving the caller's own userId from the current session
 * (`AuthService.session().userId`, decoded server-side from the access token — see
 * server/bff/jwt.ts) rather than ever asking the component layer to know or supply it.
 */
@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly authService = inject(AuthService);
  private readonly userApi = inject(DefaultService);

  getProfile(): Observable<UserProfileResponse | undefined> {
    return this.withUserId((userId) => this.userApi.getUserProfile(userId));
  }

  addAddress(input: AddressInput): Observable<Address | undefined> {
    return this.withUserId((userId) => this.userApi.addAddress(userId, input));
  }

  updateAddress(addressId: string, input: AddressInput): Observable<Address | undefined> {
    return this.withUserId((userId) => this.userApi.updateAddress(userId, addressId, input));
  }

  removeAddress(addressId: string): Observable<unknown> {
    return this.withUserId((userId) => this.userApi.removeAddress(userId, addressId));
  }

  updatePreferences(request: UpdateUserPreferencesRequest): Observable<UserProfileResponse | undefined> {
    return this.withUserId((userId) => this.userApi.updateUserPreferences(userId, request));
  }

  private withUserId<T>(fn: (userId: string) => Observable<T>): Observable<T | undefined> {
    const userId = this.authService.session()?.userId;
    if (!userId) {
      return of(undefined);
    }
    return of(userId).pipe(switchMap(fn));
  }
}

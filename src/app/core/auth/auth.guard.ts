import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

/** Guards a route behind an authenticated session, redirecting to login otherwise. */
export const authenticatedGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService
    .loadSession()
    .pipe(map((session) => (session.authenticated ? true : router.parseUrl('/account/login'))));
};

import { Routes } from '@angular/router';

export const accountRoutes: Routes = [
  {
    path: 'register',
    loadComponent: () => import('./register/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'mfa-challenge',
    loadComponent: () =>
      import('./mfa-challenge/mfa-challenge-page').then((m) => m.MfaChallengePage),
  },
  {
    path: 'password-reset',
    loadComponent: () =>
      import('./password-reset-request/password-reset-request-page').then(
        (m) => m.PasswordResetRequestPage,
      ),
  },
  {
    path: 'password-reset/confirm',
    loadComponent: () =>
      import('./password-reset-confirm/password-reset-confirm-page').then(
        (m) => m.PasswordResetConfirmPage,
      ),
  },
];

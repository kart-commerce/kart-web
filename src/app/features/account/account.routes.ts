import { Routes } from '@angular/router';

import { authenticatedGuard } from '../../core/auth/auth.guard';

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
    path: 'otp-login',
    loadComponent: () => import('./otp-login/otp-login-page').then((m) => m.OtpLoginPage),
  },
  {
    path: 'otp-login/verify',
    loadComponent: () => import('./otp-login/otp-verify-page').then((m) => m.OtpVerifyPage),
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
  {
    path: 'profile',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./profile/profile-page').then((m) => m.ProfilePage),
  },
  {
    path: 'security',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./security/security-page').then((m) => m.SecurityPage),
  },
  {
    path: 'privacy',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./privacy/privacy-page').then((m) => m.PrivacyPage),
  },
  {
    path: 'notifications',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./notifications/notifications-page').then((m) => m.NotificationsPage),
  },
];

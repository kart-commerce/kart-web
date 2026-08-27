import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with no resolved session', () => {
    expect(service.session()).toBeNull();
  });

  it('loadSession sets the session signal from /api/bff/session', () => {
    service.loadSession().subscribe();
    const req = httpMock.expectOne('/api/bff/session');
    expect(req.request.method).toBe('GET');
    req.flush({ authenticated: true, roles: ['customer'] });

    expect(service.session()).toEqual({ authenticated: true, roles: ['customer'] });
  });

  it('register sets the session on an authenticated result', () => {
    service.register({ email: 'a@b.com', password: 'password123' }).subscribe();
    const req = httpMock.expectOne('/api/bff/auth/register');
    expect(req.request.method).toBe('POST');
    req.flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });

    expect(service.session()).toEqual({ authenticated: true, roles: ['customer'] });
  });

  it('login sets the session on an authenticated result', () => {
    service.login({ email: 'a@b.com', password: 'password123' }).subscribe();
    const req = httpMock.expectOne('/api/bff/auth/login');
    req.flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });

    expect(service.session()).toEqual({ authenticated: true, roles: ['customer'] });
  });

  it('login does not set the session when MFA is required', () => {
    service.login({ email: 'a@b.com', password: 'password123' }).subscribe((result) => {
      expect(result).toEqual({
        status: 'mfa-required',
        challenge: { challengeId: 'chal-1', expiresInSeconds: 300 },
      });
    });
    const req = httpMock.expectOne('/api/bff/auth/login');
    req.flush({ status: 'mfa-required', challenge: { challengeId: 'chal-1', expiresInSeconds: 300 } });

    expect(service.session()).toBeNull();
  });

  it('verifyMfa sets the session on success', () => {
    service.verifyMfa({ challengeId: 'chal-1', totpCode: '123456' }).subscribe();
    const req = httpMock.expectOne('/api/bff/auth/mfa/verify');
    req.flush({ authenticated: true, roles: ['customer'] });

    expect(service.session()).toEqual({ authenticated: true, roles: ['customer'] });
  });

  it('requestPasswordReset posts to the reset-initiate endpoint', () => {
    service.requestPasswordReset({ email: 'a@b.com' }).subscribe();
    const req = httpMock.expectOne('/api/bff/auth/password/reset-initiate');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('confirmPasswordReset posts to the reset-confirm endpoint', () => {
    service.confirmPasswordReset({ resetToken: 'tok', newPassword: 'password123' }).subscribe();
    const req = httpMock.expectOne('/api/bff/auth/password/reset-confirm');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('logout clears the session', () => {
    service.login({ email: 'a@b.com', password: 'password123' }).subscribe();
    httpMock
      .expectOne('/api/bff/auth/login')
      .flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });

    service.logout().subscribe();
    httpMock.expectOne('/api/bff/auth/logout').flush(null);

    expect(service.session()).toEqual({ authenticated: false, roles: [] });
  });

  it('logoutThisDevice clears the session via the this-device-only endpoint', () => {
    service.login({ email: 'a@b.com', password: 'password123' }).subscribe();
    httpMock
      .expectOne('/api/bff/auth/login')
      .flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });

    service.logoutThisDevice().subscribe();
    httpMock.expectOne('/api/bff/auth/logout-this-device').flush(null);

    expect(service.session()).toEqual({ authenticated: false, roles: [] });
  });

  it('socialLoginUrl builds the same-origin BFF redirect path', () => {
    expect(service.socialLoginUrl('google')).toBe('/api/bff/auth/sso/social/google/login');
  });

  it('emits loginCompleted$ on a real login, but not on loadSession discovering an existing session', () => {
    let completions = 0;
    service.loginCompleted$.subscribe(() => completions++);

    service.loadSession().subscribe();
    httpMock.expectOne('/api/bff/session').flush({ authenticated: true, roles: ['customer'] });
    expect(completions).toBe(0);

    service.login({ email: 'a@b.com', password: 'password123' }).subscribe();
    httpMock
      .expectOne('/api/bff/auth/login')
      .flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });
    expect(completions).toBe(1);
  });

  it('emits loginCompleted$ on verifyMfa success', () => {
    let completions = 0;
    service.loginCompleted$.subscribe(() => completions++);

    service.verifyMfa({ challengeId: 'chal-1', totpCode: '123456' }).subscribe();
    httpMock.expectOne('/api/bff/auth/mfa/verify').flush({ authenticated: true, roles: ['customer'] });

    expect(completions).toBe(1);
  });
});

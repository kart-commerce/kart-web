import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, tap } from 'rxjs';

import {
  LoginRequest,
  LoginResult,
  MfaVerifyRequest,
  PasswordResetConfirmRequest,
  PasswordResetInitiateRequest,
  RegisterRequest,
  SessionInfo,
  UNAUTHENTICATED_SESSION,
} from './models';
import { SessionBroadcastService } from './session-broadcast.service';

/**
 * Client-side face of the BFF auth core (WEB-9). Every call goes to a
 * same-origin `/api/bff/auth/*` route — never to kart-api-gateway or
 * kart-identity-service directly — because the access/refresh token pair
 * lives only in the server-side Redis session store (see `server/bff/`),
 * per security.md's BFF pattern.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly broadcast = inject(SessionBroadcastService);

  /** Current session state; `null` until the first `loadSession()` resolves. */
  readonly session = signal<SessionInfo | null>(null);

  /**
   * Fires exactly once per real login completing in *this* tab — register,
   * login, or MFA verification succeeding — never for `loadSession()`
   * merely discovering an already-authenticated session on boot, and never
   * for another tab's login arriving over `BroadcastChannel`. A plain
   * `Subject` rather than a signal/effect: consumers (e.g. WEB-22's
   * guest→user cart merge) need this to fire synchronously and exactly once
   * per transition, not on whatever cadence the effect scheduler happens to
   * flush.
   */
  readonly loginCompleted$ = new Subject<void>();

  constructor() {
    this.broadcast.messages$.subscribe((message) => {
      if (message.type === 'logout') {
        this.session.set(UNAUTHENTICATED_SESSION);
      } else {
        this.loadSession().subscribe();
      }
    });
  }

  loadSession(): Observable<SessionInfo> {
    return this.http
      .get<SessionInfo>('/api/bff/session')
      .pipe(tap((session) => this.session.set(session)));
  }

  register(request: RegisterRequest): Observable<LoginResult> {
    return this.http
      .post<LoginResult>('/api/bff/auth/register', request)
      .pipe(tap((result) => this.applyLoginResult(result)));
  }

  login(request: LoginRequest): Observable<LoginResult> {
    return this.http
      .post<LoginResult>('/api/bff/auth/login', request)
      .pipe(tap((result) => this.applyLoginResult(result)));
  }

  verifyMfa(request: MfaVerifyRequest): Observable<SessionInfo> {
    return this.http.post<SessionInfo>('/api/bff/auth/mfa/verify', request).pipe(
      tap((session) => {
        this.session.set(session);
        this.broadcast.post({ type: 'login' });
        this.loginCompleted$.next();
      }),
    );
  }

  requestPasswordReset(request: PasswordResetInitiateRequest): Observable<void> {
    return this.http.post<void>('/api/bff/auth/password/reset-initiate', request);
  }

  confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<void> {
    return this.http.post<void>('/api/bff/auth/password/reset-confirm', request);
  }

  /** WEB-43 — revokes this session's entire refresh-token family: every device/tab descended from this login is invalidated, not just this one. */
  logout(): Observable<void> {
    return this.http.post<void>('/api/bff/auth/logout', {}).pipe(
      tap(() => {
        this.session.set(UNAUTHENTICATED_SESSION);
        this.broadcast.post({ type: 'logout' });
      }),
    );
  }

  /** WEB-43 — ends only this device's session; other devices/tabs sharing this login's refresh-token family stay signed in. */
  logoutThisDevice(): Observable<void> {
    return this.http.post<void>('/api/bff/auth/logout-this-device', {}).pipe(
      tap(() => {
        this.session.set(UNAUTHENTICATED_SESSION);
        this.broadcast.post({ type: 'logout' });
      }),
    );
  }

  /** Same-origin redirect target for a social-login button; the BFF proxies the 302 to the real IdP. */
  socialLoginUrl(provider: string): string {
    return `/api/bff/auth/sso/social/${provider}/login`;
  }

  private applyLoginResult(result: LoginResult): void {
    if (result.status === 'authenticated') {
      this.session.set(result.session);
      this.broadcast.post({ type: 'login' });
      this.loginCompleted$.next();
    }
  }
}

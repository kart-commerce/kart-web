import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

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
      }),
    );
  }

  requestPasswordReset(request: PasswordResetInitiateRequest): Observable<void> {
    return this.http.post<void>('/api/bff/auth/password/reset-initiate', request);
  }

  confirmPasswordReset(request: PasswordResetConfirmRequest): Observable<void> {
    return this.http.post<void>('/api/bff/auth/password/reset-confirm', request);
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/bff/auth/logout', {}).pipe(
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
    }
  }
}

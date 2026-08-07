import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { AccessTokenRefreshSchedulerService } from './access-token-refresh-scheduler.service';
import { AuthService } from './auth.service';
import { SessionInfo, UNAUTHENTICATED_SESSION } from './models';
import { RefreshCoordinatorService } from './refresh-coordinator.service';

describe('AccessTokenRefreshSchedulerService', () => {
  let sessionSignal: ReturnType<typeof signal<SessionInfo | null>>;
  let authServiceSpy: jasmine.SpyObj<Pick<AuthService, 'session'>>;
  let refreshCoordinatorSpy: jasmine.SpyObj<Pick<RefreshCoordinatorService, 'refresh'>>;

  function mkSession(accessTokenExpiresAt: string | null) {
    return { ...UNAUTHENTICATED_SESSION, authenticated: true, roles: ['customer'], accessTokenExpiresAt };
  }

  beforeEach(() => {
    jasmine.clock().install();
    sessionSignal = signal<SessionInfo | null>(null);

    authServiceSpy = jasmine.createSpyObj('AuthService', ['session']);
    authServiceSpy.session.and.callFake((() => sessionSignal()) as unknown as AuthService['session']);

    refreshCoordinatorSpy = jasmine.createSpyObj('RefreshCoordinatorService', ['refresh']);
    refreshCoordinatorSpy.refresh.and.returnValue(of(mkSession(null)));

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: RefreshCoordinatorService, useValue: refreshCoordinatorSpy },
      ],
    });
  });

  afterEach(() => jasmine.clock().uninstall());

  it('refreshes proactively, ahead of the access token expiry', () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString(); // 60s lifetime → 60s*0.2=12s buffer
    TestBed.inject(AccessTokenRefreshSchedulerService);
    sessionSignal.set(mkSession(expiresAt));
    TestBed.tick();

    jasmine.clock().tick(47_000); // short of the ~48s fire point
    expect(refreshCoordinatorSpy.refresh).not.toHaveBeenCalled();

    jasmine.clock().tick(2_000); // now past it
    expect(refreshCoordinatorSpy.refresh).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there is no access token expiry to schedule against (no session yet)', () => {
    TestBed.inject(AccessTokenRefreshSchedulerService);

    jasmine.clock().tick(10 * 60_000);
    expect(refreshCoordinatorSpy.refresh).not.toHaveBeenCalled();
  });

  it('reschedules cleanly when the session rotates to a new expiry (e.g. after a refresh)', () => {
    const firstExpiresAt = new Date(Date.now() + 60_000).toISOString();
    TestBed.inject(AccessTokenRefreshSchedulerService);
    sessionSignal.set(mkSession(firstExpiresAt));
    TestBed.tick();

    jasmine.clock().tick(49_000); // fires the first proactive refresh
    expect(refreshCoordinatorSpy.refresh).toHaveBeenCalledTimes(1);

    const secondExpiresAt = new Date(Date.now() + 120_000).toISOString();
    sessionSignal.set(mkSession(secondExpiresAt));
    TestBed.tick();

    jasmine.clock().tick(95_000); // short of the new ~96s fire point
    expect(refreshCoordinatorSpy.refresh).toHaveBeenCalledTimes(1);

    jasmine.clock().tick(5_000);
    expect(refreshCoordinatorSpy.refresh).toHaveBeenCalledTimes(2);
  });

  it('swallows a failed proactive refresh rather than throwing (the reactive 401 path remains the fallback)', () => {
    refreshCoordinatorSpy.refresh.and.returnValue(throwError(() => new Error('network error')));
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    TestBed.inject(AccessTokenRefreshSchedulerService);
    sessionSignal.set(mkSession(expiresAt));
    TestBed.tick();

    expect(() => jasmine.clock().tick(49_000)).not.toThrow();
    expect(refreshCoordinatorSpy.refresh).toHaveBeenCalledTimes(1);
  });
});

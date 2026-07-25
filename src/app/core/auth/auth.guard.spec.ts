import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UrlTree, provideRouter } from '@angular/router';
import { firstValueFrom, isObservable } from 'rxjs';

import { authenticatedGuard } from './auth.guard';

describe('authenticatedGuard', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('allows activation when the session is authenticated', async () => {
    const result = TestBed.runInInjectionContext(() => authenticatedGuard({} as never, {} as never));
    // Subscribe first (HttpClient observables are cold — nothing hits the
    // testing backend until something subscribes), *then* flush.
    const valuePromise = isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);

    httpMock.expectOne('/api/bff/session').flush({ authenticated: true, roles: ['customer'] });

    expect(await valuePromise).toBe(true);
  });

  it('redirects to /account/login when the session is not authenticated', async () => {
    const result = TestBed.runInInjectionContext(() => authenticatedGuard({} as never, {} as never));
    const valuePromise = isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);

    httpMock.expectOne('/api/bff/session').flush({ authenticated: false, roles: [] });

    const value = await valuePromise;
    expect(value).toBeInstanceOf(UrlTree);
    expect((value as UrlTree).toString()).toBe('/account/login');
  });
});

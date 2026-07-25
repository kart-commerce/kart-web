import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('retries the original request once after a successful silent refresh', () => {
    let result: unknown;
    http.get('/api/bff/some-protected-resource').subscribe((value) => (result = value));

    httpMock.expectOne('/api/bff/some-protected-resource').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/bff/auth/refresh').flush({ authenticated: true, roles: ['customer'] });
    httpMock.expectOne('/api/bff/some-protected-resource').flush({ ok: true });

    expect(result).toEqual({ ok: true });
  });

  it('propagates the original 401 when the silent refresh itself fails', () => {
    let error: unknown;
    http.get('/api/bff/some-protected-resource').subscribe({ error: (err) => (error = err) });

    httpMock.expectOne('/api/bff/some-protected-resource').flush(null, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne('/api/bff/auth/refresh').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect((error as { status: number }).status).toBe(401);
  });

  it('does not attempt a refresh for a 401 from an auth endpoint itself', () => {
    let error: unknown;
    http.post('/api/bff/auth/login', {}).subscribe({ error: (err) => (error = err) });

    httpMock.expectOne('/api/bff/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect((error as { status: number }).status).toBe(401);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the app and load the session', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const sessionReq = httpMock.expectOne('/api/bff/session');
    sessionReq.flush({ authenticated: false, roles: [] });

    expect(fixture.componentInstance).toBeTruthy();

    // CategoryNav's own top-level fetch, triggered by the same detectChanges().
    httpMock.match(() => true).forEach((req) => req.flush([]));
  });

  it('shows log in / sign up links when unauthenticated', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    httpMock.expectOne('/api/bff/session').flush({ authenticated: false, roles: [] });
    httpMock.match(() => true).forEach((req) => req.flush([]));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    expect(text).toContain('Log in');
    expect(text).toContain('Sign up');
  });
});

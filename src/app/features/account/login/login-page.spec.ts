import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { LoginPage } from './login-page';

describe('LoginPage', () => {
  let httpMock: HttpTestingController;

  function configure(queryParams: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap(queryParams)) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('navigates home on a fully-authenticated login', () => {
    configure();
    const fixture = TestBed.createComponent(LoginPage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'a@b.com', password: 'password123' });
    fixture.componentInstance.submit();

    httpMock
      .expectOne('/api/bff/auth/login')
      .flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('routes to the MFA challenge page when MFA is required', () => {
    configure();
    const fixture = TestBed.createComponent(LoginPage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'a@b.com', password: 'password123' });
    fixture.componentInstance.submit();

    httpMock
      .expectOne('/api/bff/auth/login')
      .flush({ status: 'mfa-required', challenge: { challengeId: 'chal-1', expiresInSeconds: 300 } });

    expect(navigateSpy).toHaveBeenCalledWith(['/account/mfa-challenge'], {
      queryParams: { challengeId: 'chal-1' },
    });
  });

  it('shows a social-login-failed banner from the error query param', () => {
    configure({ error: 'social_login_failed' });
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Social login failed');
  });

  it('builds the social login href from AuthService', () => {
    configure();
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll('a'),
    ) as HTMLAnchorElement[];
    const googleLink = links.find((a) => a.getAttribute('href')?.includes('google'))!;
    expect(googleLink.getAttribute('href')).toBe('/api/bff/auth/sso/social/google/login');
  });
});

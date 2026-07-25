import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { RegisterPage } from './register-page';

describe('RegisterPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RegisterPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not submit an invalid form', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.submit();

    expect(fixture.componentInstance.form.touched).toBeTrue();
    httpMock.expectNone(() => true);
  });

  it('registers and navigates home on success', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      displayName: '',
      email: 'new@example.com',
      password: 'password123',
    });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/bff/auth/register');
    req.flush({ status: 'authenticated', session: { authenticated: true, roles: ['customer'] } });

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('shows the backend error message on failure', () => {
    const fixture = TestBed.createComponent(RegisterPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({
      displayName: '',
      email: 'taken@example.com',
      password: 'password123',
    });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/bff/auth/register');
    req.flush({ code: 'email_taken', message: 'Email already registered.' }, { status: 409, statusText: 'Conflict' });

    expect(fixture.componentInstance.errorMessage()).toBe('Email already registered.');
    expect(fixture.componentInstance.submitting()).toBeFalse();
  });
});

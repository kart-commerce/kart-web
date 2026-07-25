import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { PasswordResetConfirmPage } from './password-reset-confirm-page';

describe('PasswordResetConfirmPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PasswordResetConfirmPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({ token: 'reset-tok' })) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('confirms the reset and navigates to login on success', () => {
    const fixture = TestBed.createComponent(PasswordResetConfirmPage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newpassword123' });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/bff/auth/password/reset-confirm');
    expect(req.request.body).toEqual({ resetToken: 'reset-tok', newPassword: 'newpassword123' });
    req.flush(null);

    expect(navigateSpy).toHaveBeenCalledWith(['/account/login']);
  });

  it('shows an error message for an invalid/expired token', () => {
    const fixture = TestBed.createComponent(PasswordResetConfirmPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ newPassword: 'newpassword123' });
    fixture.componentInstance.submit();

    httpMock
      .expectOne('/api/bff/auth/password/reset-confirm')
      .flush({ code: 'invalid_token', message: 'This link has expired.' }, { status: 400, statusText: 'Bad Request' });

    expect(fixture.componentInstance.errorMessage()).toBe('This link has expired.');
  });
});

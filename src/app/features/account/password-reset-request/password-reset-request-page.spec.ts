import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PasswordResetRequestPage } from './password-reset-request-page';

describe('PasswordResetRequestPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PasswordResetRequestPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('shows the same confirmation message regardless of whether the email matched an account', () => {
    const fixture = TestBed.createComponent(PasswordResetRequestPage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ email: 'someone@example.com' });
    fixture.componentInstance.submit();

    httpMock.expectOne('/api/bff/auth/password/reset-initiate').flush(null, { status: 202, statusText: 'Accepted' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "If that email is registered, we've sent password reset instructions",
    );
  });
});

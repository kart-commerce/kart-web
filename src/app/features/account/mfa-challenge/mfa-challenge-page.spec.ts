import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { MfaChallengePage } from './mfa-challenge-page';

describe('MfaChallengePage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MfaChallengePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({ challengeId: 'chal-1' })) },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('verifies the code and navigates home on success', () => {
    const fixture = TestBed.createComponent(MfaChallengePage);
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ totpCode: '123456' });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne('/api/bff/auth/mfa/verify');
    expect(req.request.body).toEqual({ challengeId: 'chal-1', totpCode: '123456' });
    req.flush({ authenticated: true, roles: ['customer'] });

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('shows an error message on an incorrect code', () => {
    const fixture = TestBed.createComponent(MfaChallengePage);
    fixture.detectChanges();

    fixture.componentInstance.form.setValue({ totpCode: '000000' });
    fixture.componentInstance.submit();

    httpMock
      .expectOne('/api/bff/auth/mfa/verify')
      .flush({ code: 'invalid_code', message: 'Incorrect code.' }, { status: 401, statusText: 'Unauthorized' });

    expect(fixture.componentInstance.errorMessage()).toBe('Incorrect code.');
  });
});

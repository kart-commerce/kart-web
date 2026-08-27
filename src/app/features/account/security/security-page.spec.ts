import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SecurityPage } from './security-page';

describe('SecurityPage', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SecurityPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('logging out this device calls the this-device-only endpoint, not the everywhere one', () => {
    const fixture = TestBed.createComponent(SecurityPage);
    fixture.detectChanges();

    fixture.componentInstance.logoutThisDevice();
    const req = httpMock.expectOne('/api/bff/auth/logout-this-device');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });

  it('logging out everywhere calls the family-revoking endpoint', () => {
    const fixture = TestBed.createComponent(SecurityPage);
    fixture.detectChanges();

    fixture.componentInstance.logoutEverywhere();
    const req = httpMock.expectOne('/api/bff/auth/logout');
    expect(req.request.method).toBe('POST');
    req.flush(null);
  });
});

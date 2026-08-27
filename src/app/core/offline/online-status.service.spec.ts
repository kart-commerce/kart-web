import { TestBed } from '@angular/core/testing';

import { OnlineStatusService } from './online-status.service';

describe('OnlineStatusService', () => {
  it('reflects navigator.onLine at construction and reacts to online/offline events', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(OnlineStatusService);

    expect(service.isOnline()).toBe(navigator.onLine);

    window.dispatchEvent(new Event('offline'));
    expect(service.isOnline()).toBeFalse();

    window.dispatchEvent(new Event('online'));
    expect(service.isOnline()).toBeTrue();
  });
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NotificationCenterService } from '../data/notification-center.service';
import { NotificationBell } from './notification-bell';

describe('NotificationBell', () => {
  let notificationCenter: NotificationCenterService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [NotificationBell],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    notificationCenter = TestBed.inject(NotificationCenterService);
  });

  it('shows the unread count badge only when there are unread notifications', () => {
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.kart-notification-bell__count')).toBeNull();

    notificationCenter.push('price-drop', 'Price drop', 'Now cheaper');
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.kart-notification-bell__count') as HTMLElement;
    expect(badge.textContent?.trim()).toBe('1');
  });

  it('toggles the panel open and closed', () => {
    const fixture = TestBed.createComponent(NotificationBell);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kart-notification-bell__panel')).toBeNull();

    (fixture.nativeElement.querySelector('.kart-notification-bell__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.kart-notification-bell__panel')).not.toBeNull();
  });
});

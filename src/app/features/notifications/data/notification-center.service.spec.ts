import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { NotificationCenterService } from './notification-center.service';

describe('NotificationCenterService', () => {
  let service: NotificationCenterService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationCenterService);
  });

  it('starts empty', () => {
    expect(service.notifications()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
  });

  it('pushes a new unread notification to the front of the list', () => {
    service.push('price-drop', 'Price drop', 'Aura Phone is now $899.');

    expect(service.notifications().length).toBe(1);
    expect(service.notifications()[0].read).toBeFalse();
    expect(service.unreadCount()).toBe(1);
  });

  it('marks a single notification read without affecting others', () => {
    service.push('price-drop', 'A', 'a');
    service.push('order-update', 'B', 'b');
    const [first, second] = service.notifications();

    service.markRead(first.id);

    expect(service.notifications().find((n) => n.id === first.id)?.read).toBeTrue();
    expect(service.notifications().find((n) => n.id === second.id)?.read).toBeFalse();
    expect(service.unreadCount()).toBe(1);
  });

  it('marks every notification read', () => {
    service.push('price-drop', 'A', 'a');
    service.push('order-update', 'B', 'b');

    service.markAllRead();

    expect(service.unreadCount()).toBe(0);
  });
});

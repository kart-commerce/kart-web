import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { NotificationCenterService } from '../data/notification-center.service';
import { PushRegistrationService } from '../data/push-registration.service';

/**
 * Placeholder VAPID public key — a real one is provisioned alongside the (currently
 * nonexistent) push-registration backend endpoint; see push-registration.service.ts's note.
 */
const VAPID_PUBLIC_KEY = 'REPLACE_WITH_REAL_VAPID_PUBLIC_KEY';

/** Header bell — unread badge + a dropdown listing the notification center (WEB-49/WEB-50). */
@Component({
  selector: 'kart-notification-bell',
  imports: [DatePipe, RouterLink],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  protected readonly notificationCenter = inject(NotificationCenterService);
  protected readonly pushRegistration = inject(PushRegistrationService);
  readonly open = signal(false);

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  select(id: string): void {
    this.notificationCenter.markRead(id);
  }

  enablePushNotifications(): void {
    void this.pushRegistration.requestAndRegister(VAPID_PUBLIC_KEY);
  }
}

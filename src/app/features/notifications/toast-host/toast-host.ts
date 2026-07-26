import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { Alert, AlertVariant } from '../../../shared/ui';
import { NotificationService, ToastVariant } from '../data/notification.service';

const ALERT_VARIANTS: Readonly<Record<ToastVariant, AlertVariant>> = {
  success: 'success',
  info: 'info',
  danger: 'danger',
};

@Component({
  selector: 'kart-toast-host',
  imports: [Alert],
  templateUrl: './toast-host.html',
  styleUrl: './toast-host.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastHost {
  protected readonly notificationService = inject(NotificationService);
  protected readonly alertVariants = ALERT_VARIANTS;
}

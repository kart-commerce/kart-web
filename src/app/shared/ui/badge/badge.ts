import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** Small pill for counts and status labels (cart count, order status, promo tags). */
@Component({
  selector: 'kart-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly variant = input<BadgeVariant>('neutral');
}

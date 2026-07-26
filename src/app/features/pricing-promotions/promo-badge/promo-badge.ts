import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Badge } from '../../../shared/ui';
import { Promotion } from '../data/models';

@Component({
  selector: 'kart-promo-badge',
  imports: [Badge],
  templateUrl: './promo-badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBadge {
  readonly promotion = input.required<Promotion | undefined>();
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type LogoVariant = 'full' | 'mark';

/** Brand mark (public/logo.svg) with an optional wordmark, shared by the header and anywhere else the brand appears. */
@Component({
  selector: 'kart-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly variant = input<LogoVariant>('full');
}

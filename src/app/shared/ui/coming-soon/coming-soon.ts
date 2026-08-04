import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Card } from '../card/card';

/**
 * Graceful fallback for a `🚧`-flagged feature whose Unleash flag is OFF
 * (api-strategy.md §6) — never a broken call, console error, or silently
 * missing nav item. Reused for every not-yet-GA feature rather than each one
 * inventing its own empty state.
 */
@Component({
  selector: 'kart-coming-soon',
  imports: [Card],
  templateUrl: './coming-soon.html',
  styleUrl: './coming-soon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoon {
  readonly title = input('Coming soon');
  readonly message = input("We're still putting the finishing touches on this. Check back soon.");
}

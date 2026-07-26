import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Elevated surface container used for product tiles, summary panels, and list rows. */
@Component({
  selector: 'kart-card',
  templateUrl: './card.html',
  styleUrl: './card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly padded = input(true);
}

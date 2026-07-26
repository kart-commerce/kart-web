import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Read-only 5-star display used everywhere a rating average is shown (card, PDP, reviews). */
@Component({
  selector: 'kart-rating-stars',
  templateUrl: './rating-stars.html',
  styleUrl: './rating-stars.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RatingStars {
  readonly average = input.required<number>();
  readonly count = input<number | null>(null);

  protected readonly stars = computed(() => {
    const rounded = Math.round(this.average());
    return Array.from({ length: 5 }, (_, index) => rounded >= index + 1);
  });
}

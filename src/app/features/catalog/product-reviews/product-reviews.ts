import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { Badge, Button, FormField, KartInput, RatingStars } from '../../../shared/ui';
import { ReviewService } from '../data/review.service';
import { Review } from '../data/models';

/**
 * WEB-18 — meant to be instantiated only inside an `@defer (on viewport)` block
 * (product-page.html), same freshness reasoning as `ProductRecommendations`: a moderated-out
 * review must never render as still-published due to staleness (edge-cases.md), so this
 * component always fetches fresh at its actual trigger time, never reusing an SSR-time value.
 *
 * Submission (not just display): a submitted review is always `pending` server-side
 * (`ReviewService.submitReview`) and is rendered here, for this session only, with an explicit
 * "Pending moderation" badge — it is never written into the shared published list the next
 * visitor sees.
 */
@Component({
  selector: 'kart-product-reviews',
  imports: [DatePipe, ReactiveFormsModule, Badge, Button, FormField, KartInput, RatingStars],
  templateUrl: './product-reviews.html',
  styleUrl: './product-reviews.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductReviews {
  private readonly reviewService = inject(ReviewService);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  readonly sku = input.required<string>();

  readonly rating = toSignal(toObservable(this.sku).pipe(switchMap((sku) => this.reviewService.getRating(sku))), {
    initialValue: undefined,
  });

  readonly reviews = toSignal(toObservable(this.sku).pipe(switchMap((sku) => this.reviewService.listReviews(sku))), {
    initialValue: [],
  });

  readonly pendingSubmission = signal<Review | null>(null);
  readonly showForm = signal(false);
  readonly submitting = signal(false);

  readonly form = this.formBuilder.group({
    author: ['', Validators.required],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    title: ['', Validators.required],
    body: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.reviewService.submitReview(this.sku(), value).subscribe((review) => {
      this.submitting.set(false);
      this.pendingSubmission.set(review);
      this.showForm.set(false);
      this.form.reset({ rating: 5 });
    });
  }
}

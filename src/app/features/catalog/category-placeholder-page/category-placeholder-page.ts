import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

/**
 * Placeholder destination for category-nav links so the nav is genuinely
 * clickable end-to-end without dead links — the real Product Listing Page
 * (WEB-14) is out of scope for this pass.
 */
@Component({
  selector: 'kart-category-placeholder-page',
  templateUrl: './category-placeholder-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  readonly categoryId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('categoryId') ?? '')),
    { initialValue: '' },
  );
}

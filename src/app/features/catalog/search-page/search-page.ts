import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { Spinner } from '../../../shared/ui';
import { ProductCard } from '../product-card/product-card';
import { SearchService } from '../data/search.service';

@Component({
  selector: 'kart-search-page',
  imports: [Spinner, ProductCard],
  templateUrl: './search-page.html',
  styleUrl: './search-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPage {
  private readonly route = inject(ActivatedRoute);
  private readonly searchService = inject(SearchService);

  readonly query = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('q') ?? '')),
    { initialValue: '' },
  );

  readonly results = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => params.get('q') ?? ''),
      switchMap((query) => this.searchService.search(query)),
    ),
    { initialValue: undefined },
  );
}

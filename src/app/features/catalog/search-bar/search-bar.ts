import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';

import { SearchService } from '../data/search.service';

const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 5;

/**
 * WEB-16 — header search box. Suggestions are instant/debounced-as-you-type (never one
 * keystroke = one request); submitting (Enter or the button) always navigates to the full
 * search-results page, which re-queries fresh rather than trusting the suggestion list.
 */
@Component({
  selector: 'kart-search-bar',
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  private readonly router = inject(Router);
  private readonly searchService = inject(SearchService);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  readonly queryText = signal('');
  readonly suggestionsOpen = signal(false);

  readonly suggestions = toSignal(
    toObservable(this.queryText).pipe(
      debounceTime(DEBOUNCE_MS),
      distinctUntilChanged(),
      map((value) => value.trim()),
      switchMap((value) => (value ? this.searchService.search(value) : of([]))),
      map((results) => results.slice(0, MAX_SUGGESTIONS)),
    ),
    { initialValue: [] },
  );

  onInput(value: string): void {
    this.queryText.set(value);
    this.suggestionsOpen.set(value.trim().length > 0);
  }

  selectSuggestion(sku: string): void {
    this.suggestionsOpen.set(false);
    this.router.navigate(['/p', sku]);
  }

  closeSuggestions(): void {
    // Deferred so a suggestion's own click handler still fires before the list unmounts.
    setTimeout(() => this.suggestionsOpen.set(false), 150);
  }

  submit(event: SubmitEvent): void {
    event.preventDefault();
    this.suggestionsOpen.set(false);
    const query = this.input().nativeElement.value.trim();
    if (query) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
    }
  }
}

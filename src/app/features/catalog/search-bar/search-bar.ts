import { ChangeDetectionStrategy, Component, ElementRef, inject, viewChild } from '@angular/core';
import { Router } from '@angular/router';

/** Header search box — submits to the search results page rather than searching inline. */
@Component({
  selector: 'kart-search-bar',
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBar {
  private readonly router = inject(Router);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('input');

  submit(event: SubmitEvent): void {
    event.preventDefault();
    const query = this.input().nativeElement.value.trim();
    if (query) {
      this.router.navigate(['/search'], { queryParams: { q: query } });
    }
  }
}

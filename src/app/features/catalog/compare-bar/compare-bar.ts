import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CompareService } from '../data/compare.service';

/** Floating bar surfaced app-wide while ≥1 product is queued for comparison (WEB-19). */
@Component({
  selector: 'kart-compare-bar',
  imports: [RouterLink],
  template: `
    @if (compareService.count() > 0) {
      <div class="kart-compare-bar" role="status">
        <span>{{ compareService.count() }} selected to compare</span>
        <a class="kart-compare-bar__link" routerLink="/compare">Compare now</a>
        <button type="button" class="kart-compare-bar__clear" (click)="compareService.clear()">Clear</button>
      </div>
    }
  `,
  styles: [
    `
      .kart-compare-bar {
        position: fixed;
        bottom: var(--kart-spacing-lg);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: var(--kart-spacing-md);
        background-color: var(--kart-color-surface);
        border: 1px solid var(--kart-color-border);
        border-radius: var(--kart-radius-pill);
        box-shadow: var(--kart-shadow-level-2);
        padding: var(--kart-spacing-sm) var(--kart-spacing-lg);
        z-index: 100;
        font-size: var(--kart-font-size-caption);
      }

      .kart-compare-bar__link {
        color: var(--kart-color-primary);
        font-weight: var(--kart-font-weight-medium);
      }

      .kart-compare-bar__clear {
        border: none;
        background: none;
        color: var(--kart-color-text-muted);
        cursor: pointer;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareBar {
  protected readonly compareService = inject(CompareService);
}

import { Injectable, computed, signal } from '@angular/core';

const MAX_COMPARE_ITEMS = 4;

/**
 * WEB-19 — product comparison, resolved as a thin client-side-only feature
 * (requirement-spec.md §9 resolution #2): selected SKUs held in memory/session only, resolved
 * against already-fetched Product data — no dedicated backend endpoint, no persistence beyond
 * the current tab's session.
 */
@Injectable({ providedIn: 'root' })
export class CompareService {
  private readonly skus = signal<readonly string[]>([]);

  readonly selectedSkus = this.skus.asReadonly();
  readonly count = computed(() => this.skus().length);
  readonly isFull = computed(() => this.skus().length >= MAX_COMPARE_ITEMS);

  isComparing(sku: string): boolean {
    return this.skus().includes(sku);
  }

  toggle(sku: string): void {
    if (this.isComparing(sku)) {
      this.remove(sku);
    } else if (!this.isFull()) {
      this.skus.update((current) => [...current, sku]);
    }
  }

  remove(sku: string): void {
    this.skus.update((current) => current.filter((candidate) => candidate !== sku));
  }

  clear(): void {
    this.skus.set([]);
  }
}

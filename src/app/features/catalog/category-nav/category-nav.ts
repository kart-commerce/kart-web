import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, signal } from '@angular/core';

import { Spinner } from '../../../shared/ui';
import { CategoryNavService } from './category-nav.service';
import { CategoryNavItem } from './category-nav-item';
import { CategoryTreeNode } from './category-tree-node';

@Component({
  selector: 'kart-category-nav',
  imports: [Spinner, CategoryNavItem],
  templateUrl: './category-nav.html',
  styleUrl: './category-nav.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryNav {
  private readonly categoryNavService = inject(CategoryNavService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly tree = signal<readonly CategoryTreeNode[] | null>(null);
  readonly loadFailed = signal(false);
  readonly open = signal(false);

  constructor() {
    this.categoryNavService.loadRoot().subscribe({
      next: (tree) => this.tree.set(tree),
      error: () => this.loadFailed.set(true),
    });
  }

  toggleOpen(): void {
    this.open.update((value) => !value);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}

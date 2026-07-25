import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

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

  readonly tree = signal<readonly CategoryTreeNode[] | null>(null);
  readonly loadFailed = signal(false);

  constructor() {
    this.categoryNavService.loadTree().subscribe({
      next: (tree) => this.tree.set(tree),
      error: () => this.loadFailed.set(true),
    });
  }
}

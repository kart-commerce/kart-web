import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CategoryNavService } from './category-nav.service';
import { CategoryTreeNode, MAX_CATEGORY_DEPTH } from './category-tree-node';

@Component({
  selector: 'kart-category-nav-item',
  imports: [RouterLink, CategoryNavItem],
  templateUrl: './category-nav-item.html',
  styleUrl: './category-nav-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryNavItem {
  private readonly categoryNavService = inject(CategoryNavService);

  readonly node = input.required<CategoryTreeNode>();

  readonly expanded = signal(false);
  readonly children = signal<readonly CategoryTreeNode[] | null>(null);
  readonly loadFailed = signal(false);

  readonly canExpand = computed(() => this.node().depth < MAX_CATEGORY_DEPTH);

  toggle(): void {
    const expanding = !this.expanded();
    this.expanded.set(expanding);

    if (expanding && this.children() === null) {
      this.categoryNavService.loadChildren(this.node().categoryId).subscribe({
        next: (children) => this.children.set(children),
        error: () => this.loadFailed.set(true),
      });
    }
  }
}

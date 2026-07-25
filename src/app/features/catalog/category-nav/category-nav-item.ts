import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CategoryTreeNode } from './category-tree-node';

@Component({
  selector: 'kart-category-nav-item',
  imports: [RouterLink, CategoryNavItem],
  templateUrl: './category-nav-item.html',
  styleUrl: './category-nav-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryNavItem {
  readonly node = input.required<CategoryTreeNode>();

  readonly expanded = signal(false);

  toggle(): void {
    this.expanded.update((value) => !value);
  }
}

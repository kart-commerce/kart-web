import { Category } from '../../../core/http/generated/category/v1/model/category';

export interface CategoryTreeNode extends Category {
  readonly children: readonly CategoryTreeNode[];
}

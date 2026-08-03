import { Category } from '../../../core/http/generated/category/v1/model/category';

export type CategoryTreeNode = Category;

/** kart-category-service's own max-depth invariant — depth 4 categories are always leaves. */
export const MAX_CATEGORY_DEPTH = 4;

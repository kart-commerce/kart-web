import { placeholderImage } from '../../../shared/util/placeholder-image';
import { SearchResultItem } from '../../../core/http/generated/search/v1/model/searchResultItem';
import { ProductSummary } from './models';

export function toProductSummary(item: SearchResultItem): ProductSummary {
  return {
    sku: item.sku,
    // The search index doesn't carry a product-group id — only PDP's own real GetProduct call
    // (ProductService.getBySku) resolves it; a search-result card never needs it, only the sku.
    groupId: '',
    name: item.name,
    brand: item.brand,
    categoryId: item.category.categoryId,
    thumbnailUrl: item.imageUrl || placeholderImage(item.sku, item.name),
    price: item.price,
    ratingAverage: item.rating.avg ?? 0,
    ratingCount: item.rating.count ?? 0,
    // Discontinued documents are excluded from the index entirely (search-service's own
    // edge-cases.md) — every result returned here is catalog-Active; real-time stock is checked
    // again at PDP/cart time, not re-fetched per search result.
    inStock: true,
  };
}

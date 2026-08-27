import { Money } from '../../../shared/util/money';

/** Client-side cart line, snapshotting enough of the product to render the cart without a re-fetch per line. */
export interface CartItem {
  readonly sku: string;
  readonly name: string;
  readonly thumbnailUrl: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly maxQuantity: number;
  /**
   * Re-validated against ProductService on every cart load/focus (WEB-24,
   * Domain Invariant #4) — a line already in the cart must stop rendering as
   * available the instant the backend has signaled otherwise, not just at
   * add-to-cart time.
   */
  readonly inStock: boolean;
}

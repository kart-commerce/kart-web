import { Money } from '../../../shared/util/money';

/** Client-side cart line, snapshotting enough of the product to render the cart without a re-fetch per line. */
export interface CartItem {
  readonly sku: string;
  readonly name: string;
  readonly thumbnailUrl: string;
  readonly unitPrice: Money;
  readonly quantity: number;
  readonly maxQuantity: number;
}

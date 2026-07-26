import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Card } from '../../../shared/ui';
import { ProductCard } from '../../catalog/product-card/product-card';
import { WishlistService } from '../data/wishlist.service';

@Component({
  selector: 'kart-wishlist-page',
  imports: [RouterLink, Card, ProductCard],
  templateUrl: './wishlist-page.html',
  styleUrl: './wishlist-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistPage {
  protected readonly wishlistService = inject(WishlistService);
}

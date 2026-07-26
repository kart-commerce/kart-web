import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { WishlistService } from '../data/wishlist.service';

@Component({
  selector: 'kart-wishlist-indicator',
  imports: [RouterLink],
  templateUrl: './wishlist-indicator.html',
  styleUrl: './wishlist-indicator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WishlistIndicator {
  protected readonly wishlistService = inject(WishlistService);
}

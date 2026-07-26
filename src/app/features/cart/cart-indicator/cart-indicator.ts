import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CartService } from '../data/cart.service';

@Component({
  selector: 'kart-cart-indicator',
  imports: [RouterLink],
  templateUrl: './cart-indicator.html',
  styleUrl: './cart-indicator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartIndicator {
  protected readonly cartService = inject(CartService);
}

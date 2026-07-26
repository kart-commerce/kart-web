import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { CategoryNav } from './features/catalog/category-nav/category-nav';
import { SearchBar } from './features/catalog/search-bar/search-bar';
import { CartIndicator } from './features/cart/cart-indicator/cart-indicator';
import { WishlistIndicator } from './features/wishlist/wishlist-indicator/wishlist-indicator';
import { ToastHost } from './features/notifications/toast-host/toast-host';
import { Logo, ThemeToggle } from './shared/ui';

@Component({
  selector: 'kart-root',
  imports: [
    RouterOutlet,
    RouterLink,
    CategoryNav,
    SearchBar,
    CartIndicator,
    WishlistIndicator,
    ToastHost,
    Logo,
    ThemeToggle,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly authService = inject(AuthService);
  protected readonly currentYear = new Date().getFullYear();

  constructor() {
    this.authService.loadSession().subscribe();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';
import { CategoryNav } from './features/catalog/category-nav/category-nav';

@Component({
  selector: 'kart-root',
  imports: [RouterOutlet, RouterLink, CategoryNav],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly authService = inject(AuthService);

  constructor() {
    this.authService.loadSession().subscribe();
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}

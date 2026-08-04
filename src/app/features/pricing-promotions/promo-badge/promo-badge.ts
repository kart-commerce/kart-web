import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';

import { Badge } from '../../../shared/ui';
import { Promotion } from '../data/models';

const TICK_MS = 1000;

/** WEB-29 — active-promotion badge, plus a flash-sale countdown when the promotion carries a real `endsAt`. */
@Component({
  selector: 'kart-promo-badge',
  imports: [Badge],
  templateUrl: './promo-badge.html',
  styleUrl: './promo-badge.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBadge implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly now = signal(Date.now());
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  readonly promotion = input.required<Promotion | undefined>();

  protected readonly countdown = computed(() => {
    const endsAt = this.promotion()?.endsAt;
    if (!endsAt) {
      return null;
    }
    const remainingMs = new Date(endsAt).getTime() - this.now();
    if (remainingMs <= 0) {
      return null;
    }
    const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remainingMs / (60 * 60 * 1000)) % 24);
    const minutes = Math.floor((remainingMs / (60 * 1000)) % 60);
    const seconds = Math.floor((remainingMs / 1000) % 60);
    return days > 0 ? `${days}d ${hours}h left` : `${hours}h ${minutes}m ${seconds}s left`;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.intervalHandle = setInterval(() => this.now.set(Date.now()), TICK_MS);
    }
  }

  ngOnDestroy(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }
  }
}

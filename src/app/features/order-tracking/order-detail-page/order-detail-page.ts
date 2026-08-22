import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { Badge, Button, Card, ComingSoon, Spinner } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { CurrencyService } from '../../../core/i18n/currency.service';
import { FeatureFlagsStore } from '../../../core/config/feature-flags.store';
import { RealtimeConnectionManager } from '../../../core/realtime/realtime-connection-manager';
import { ProductRecommendations } from '../../catalog/product-recommendations/product-recommendations';
import { OrderService, ReturnRequestConflictError } from '../data/order.service';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_SEQUENCE,
  OrderLineItem,
  OrderStatus,
  RETURN_REASON_LABELS,
  ReturnReasonCode,
  availableOrderActions,
  formatOrderNumber,
} from '../data/models';

const POLL_INTERVAL_MS = 15_000;

/**
 * WEB-37/38/39 — state-machine-aware action surface (checkout-and-refunds.md Part C), cancel
 * order, and real-time order/delivery status (WEB-10's `RealtimeConnectionManager`, subscribed
 * to the `order-status` channel) with a polling fallback that keeps running regardless of the
 * socket's own connection state — a dropped real-time connection degrades to the poll and a
 * visible reconnecting indicator, it never blocks anything (architecture.md's Real-Time
 * Integration section). WEB-35/36's return-request submission is gated behind
 * `ff-return-request-order-service` (still 🚧, WEB-XT-1) and shows a "coming soon" fallback when
 * that flag is off, per api-strategy.md §6.
 */
@Component({
  selector: 'kart-order-detail-page',
  imports: [RouterLink, DatePipe, KeyValuePipe, Badge, Button, Card, ComingSoon, Spinner, MoneyPipe, ProductRecommendations],
  templateUrl: './order-detail-page.html',
  styleUrl: './order-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);
  private readonly currencyService = inject(CurrencyService);
  private readonly realtime = inject(RealtimeConnectionManager);
  protected readonly featureFlags = inject(FeatureFlagsStore);
  protected readonly connectionStatus = this.realtime.status;

  protected readonly statusSequence = ORDER_STATUS_SEQUENCE;
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly returnReasonLabels = RETURN_REASON_LABELS;
  protected readonly formatOrderNumber = formatOrderNumber;

  private readonly orderId$ = this.route.paramMap.pipe(map((params) => params.get('orderId') ?? ''));
  private readonly refreshTick = signal(0);

  readonly order = toSignal(
    this.orderId$.pipe(
      switchMap((orderId) => {
        this.refreshTick();
        return this.orderService.getById(orderId);
      }),
    ),
    { initialValue: undefined },
  );

  readonly availableActions = computed(() => (this.order() ? availableOrderActions(this.order()!) : new Set()));
  readonly showsOriginalCurrencyNote = computed(() => {
    const order = this.order();
    return !!order && order.total.currency !== this.currencyService.activeCurrency();
  });

  readonly cancelling = signal(false);
  readonly cancelError = signal<string | null>(null);

  readonly returningItems = signal(false);
  readonly returnFormOpen = signal(false);
  readonly returnReason = signal<ReturnReasonCode>('no-longer-needed');
  readonly returnNote = signal('');
  readonly returnSelectedSkus = signal<ReadonlySet<string>>(new Set());
  readonly returnError = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const order = this.order();
      // Poll only while the order hasn't reached a terminal state — no point polling a
      // cancelled/refunded order forever. Kept running regardless of the real-time channel's
      // own connection state — the poll is the fallback, never gated on the socket being up.
      if (!order || order.status === 'cancelled' || order.status === 'refunded') {
        return;
      }
      const handle = setInterval(() => this.refreshTick.update((n) => n + 1), POLL_INTERVAL_MS);
      onCleanup(() => clearInterval(handle));
    });

    // WEB-10/39 — a push on this order's own channel short-circuits the poll interval, but
    // the poll above keeps running as the fallback if the socket is degraded/reconnecting.
    this.realtime
      .subscribe<{ orderId: string }>('order-status')
      .subscribe((message) => {
        if (message.orderId === this.order()?.orderId) {
          this.refreshTick.update((n) => n + 1);
        }
      });
    this.realtime.connect();
  }

  isReached(status: OrderStatus, currentStatus: OrderStatus): boolean {
    if (!this.statusSequence.includes(currentStatus)) {
      return false;
    }
    return this.statusSequence.indexOf(status) <= this.statusSequence.indexOf(currentStatus);
  }

  lineTotal(item: OrderLineItem) {
    return { amount: item.unitPrice.amount * item.quantity, currency: item.unitPrice.currency };
  }

  cancelOrder(): void {
    const order = this.order();
    if (!order || this.cancelling()) {
      return;
    }
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.orderService.cancelOrder(order.orderId, crypto.randomUUID()).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.refreshTick.update((n) => n + 1);
      },
      error: () => {
        this.cancelling.set(false);
        this.cancelError.set('This order can no longer be cancelled.');
      },
    });
  }

  toggleReturnLine(sku: string): void {
    this.returnSelectedSkus.update((current) => {
      const next = new Set(current);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  }

  submitReturnRequest(): void {
    const order = this.order();
    const selectedSkus = this.returnSelectedSkus();
    if (!order || selectedSkus.size === 0 || this.returningItems()) {
      return;
    }

    this.returningItems.set(true);
    this.returnError.set(null);

    this.orderService
      .submitReturnRequest(
        order.orderId,
        {
          reasonCode: this.returnReason(),
          note: this.returnNote() || undefined,
          lineSelections: order.items
            .filter((item) => selectedSkus.has(item.sku))
            .map((item) => ({ sku: item.sku, quantity: item.quantity })),
        },
        crypto.randomUUID(),
      )
      .subscribe({
        next: () => {
          this.returningItems.set(false);
          this.returnFormOpen.set(false);
          this.refreshTick.update((n) => n + 1);
        },
        error: (error: unknown) => {
          this.returningItems.set(false);
          this.returnError.set(
            error instanceof ReturnRequestConflictError
              ? error.message
              : 'Something went wrong submitting your return request. Please try again.',
          );
        },
      });
  }
}

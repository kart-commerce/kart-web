import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

import { Badge, Card } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { OrderService } from '../data/order.service';
import { ORDER_STATUS_LABELS, formatOrderNumber } from '../data/models';

@Component({
  selector: 'kart-order-history-page',
  imports: [RouterLink, DatePipe, Badge, Card, MoneyPipe],
  templateUrl: './order-history-page.html',
  styleUrl: './order-history-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderHistoryPage {
  private readonly orderService = inject(OrderService);

  protected readonly formatOrderNumber = formatOrderNumber;
  protected readonly statusLabels = ORDER_STATUS_LABELS;

  readonly orders = toSignal(this.orderService.listForUser(), { initialValue: [] });
}

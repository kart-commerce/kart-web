import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap } from 'rxjs';

import { Badge, Card, Spinner } from '../../../shared/ui';
import { MoneyPipe } from '../../../shared/util';
import { OrderService } from '../data/order.service';
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_SEQUENCE,
  OrderLineItem,
  OrderStatus,
  formatOrderNumber,
} from '../data/models';

@Component({
  selector: 'kart-order-detail-page',
  imports: [RouterLink, DatePipe, Badge, Card, Spinner, MoneyPipe],
  templateUrl: './order-detail-page.html',
  styleUrl: './order-detail-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly orderService = inject(OrderService);

  protected readonly statusSequence = ORDER_STATUS_SEQUENCE;
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly formatOrderNumber = formatOrderNumber;

  readonly order = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('orderId') ?? ''),
      switchMap((orderId) => this.orderService.getById(orderId)),
    ),
    { initialValue: undefined },
  );

  isReached(status: OrderStatus, currentStatus: OrderStatus): boolean {
    return this.statusSequence.indexOf(status) <= this.statusSequence.indexOf(currentStatus);
  }

  lineTotal(item: OrderLineItem) {
    return { amount: item.unitPrice.amount * item.quantity, currency: item.unitPrice.currency };
  }
}

import { Pipe, PipeTransform } from '@angular/core';

import { Money } from './money';

@Pipe({ name: 'kartMoney' })
export class MoneyPipe implements PipeTransform {
  transform(money: Money | null | undefined): string {
    if (!money) {
      return '';
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: money.currency }).format(
      money.amount,
    );
  }
}

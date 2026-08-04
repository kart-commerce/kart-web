import { Pipe, PipeTransform, inject } from '@angular/core';

import { TranslateService } from './translate.service';

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translateService = inject(TranslateService);

  transform(key: string, params: Readonly<Record<string, string | number>> = {}): string {
    return this.translateService.translate(key, params);
  }
}

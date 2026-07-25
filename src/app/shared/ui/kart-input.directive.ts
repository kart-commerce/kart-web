import { Directive } from '@angular/core';

/**
 * Token-based styling for native `<input>`/`<select>` elements used with
 * Reactive Forms directly (`[formControl]`/`formControlName`) — a thin
 * attribute directive rather than a ControlValueAccessor wrapper component,
 * since a native input is already a fully-compliant form control and
 * wrapping it would only add indirection.
 */
@Directive({
  selector: 'input[kartInput], select[kartInput]',
  host: { class: 'kart-input' },
})
export class KartInput {}

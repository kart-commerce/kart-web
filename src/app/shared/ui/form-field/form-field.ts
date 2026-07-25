import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Thin label/error/hint wrapper around a projected native `<input>`. The
 * consumer is responsible for setting `[id]="inputId"` on the projected
 * input themselves (rather than this component generating one) — a
 * generated id would differ between the SSR render and the browser's first
 * render unless derived from render order in lockstep, which is a needless
 * hydration-mismatch risk for what a plain, explicit id avoids entirely.
 */
@Component({
  selector: 'kart-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormField {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly error = input<string | null>(null);
  readonly hint = input<string | null>(null);
}

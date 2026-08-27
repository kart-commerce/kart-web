import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  inject,
  output,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export interface PaymentToken {
  readonly token: string;
  readonly brand: string;
  readonly last4: string;
}

/**
 * WEB-32 — payment tokenization integration. Card entry lives entirely inside an isolated
 * `srcdoc` `<iframe>`, never as first-party `FormControl`s in this app's own DOM/JS realm —
 * this component (and `kart-web`'s own code generally) only ever receives the resulting
 * opaque token via `postMessage`, never a raw PAN/CVC (requirement-spec.md §5,
 * architecture.md's Payment Gateway dependency row).
 *
 * This simulates the real architecture's isolation boundary (genuine cross-frame separation —
 * the parent never reaches into `iframe.contentWindow`/`contentDocument`) without a real
 * external gateway contracted yet. Swapping in a real vendor's hosted-field script (Stripe
 * Elements, Adyen Web Components, Braintree Hosted Fields, …) means replacing this
 * component's internal `srcdoc` markup with that vendor's actual mount call — the
 * `tokenized` output contract to the rest of checkout does not change.
 */
@Component({
  selector: 'kart-payment-tokenization-field',
  template: `
    <iframe
      #frame
      class="kart-payment-tokenization-field"
      title="Secure payment entry"
      [srcdoc]="frameHtml"
    ></iframe>
  `,
  styles: [
    `
      .kart-payment-tokenization-field {
        width: 100%;
        min-height: 260px;
        border: 1px solid var(--kart-color-border, #e2e8f0);
        border-radius: var(--kart-radius-md, 8px);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentTokenizationField implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sanitizer = inject(DomSanitizer);

  @ViewChild('frame') private readonly frameRef?: ElementRef<HTMLIFrameElement>;

  readonly tokenized = output<PaymentToken>();
  readonly validityChanged = output<boolean>();

  // FRAME_HTML is a fixed, developer-authored constant (never user input) — bypassing
  // sanitization is required so the isolated frame's own `<script>` (its tokenization logic)
  // survives Angular's default `[srcdoc]` HTML sanitization, which otherwise strips it.
  protected readonly frameHtml: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(FRAME_HTML);

  private readonly boundOnMessage = (event: MessageEvent) => this.onMessage(event);

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('message', this.boundOnMessage);
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('message', this.boundOnMessage);
    }
  }

  /** Asks the isolated frame to submit/tokenize its currently-entered card details. */
  requestTokenization(): void {
    this.frameRef?.nativeElement.contentWindow?.postMessage({ type: 'kart-tokenize-request' }, '*');
  }

  private onMessage(event: MessageEvent): void {
    if (event.source !== this.frameRef?.nativeElement.contentWindow) {
      return;
    }
    const data = event.data as { type?: string; valid?: boolean; token?: string; brand?: string; last4?: string };
    if (data?.type === 'kart-payment-validity') {
      this.validityChanged.emit(!!data.valid);
    }
    if (data?.type === 'kart-payment-token' && data.token && data.brand && data.last4) {
      this.tokenized.emit({ token: data.token, brand: data.brand, last4: data.last4 });
    }
  }
}

/**
 * The isolated frame's entire content — deliberately inline/self-contained (no imports, no
 * access to the parent app's JS realm) since a real vendor's hosted field is exactly this: a
 * document `kart-web` never touches, embedded from an origin `kart-web` doesn't control.
 */
const FRAME_HTML = `<!doctype html>
<html>
<head>
<style>
  body { font-family: system-ui, sans-serif; font-size: 14px; margin: 12px; color: #0F172A; }
  label { display: block; margin-bottom: 10px; }
  input { display: block; width: 100%; box-sizing: border-box; padding: 6px 8px; margin-top: 2px; border: 1px solid #CBD5E1; border-radius: 4px; }
  .row { display: flex; gap: 8px; }
  .row > label { flex: 1; }
  .error { color: #DC2626; font-size: 12px; }
</style>
</head>
<body>
  <form id="f">
    <label>Cardholder name<input id="name" autocomplete="cc-name" /></label>
    <label>Card number<input id="number" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" /></label>
    <div class="row">
      <label>Expiry (MM/YY)<input id="expiry" autocomplete="cc-exp" placeholder="MM/YY" /></label>
      <label>CVC<input id="cvc" inputmode="numeric" autocomplete="cc-csc" /></label>
    </div>
    <p class="error" id="error"></p>
  </form>
  <script>
    function currentValues() {
      return {
        name: document.getElementById('name').value.trim(),
        number: document.getElementById('number').value.replace(/\\s+/g, ''),
        expiry: document.getElementById('expiry').value.trim(),
        cvc: document.getElementById('cvc').value.trim(),
      };
    }
    function isValid(v) {
      return v.name.length > 0 && /^\\d{13,19}$/.test(v.number) && /^(0[1-9]|1[0-2])\\/\\d{2}$/.test(v.expiry) && /^\\d{3,4}$/.test(v.cvc);
    }
    function reportValidity() {
      parent.postMessage({ type: 'kart-payment-validity', valid: isValid(currentValues()) }, '*');
    }
    document.getElementById('f').addEventListener('input', reportValidity);
    window.addEventListener('message', function (event) {
      if (!event.data || event.data.type !== 'kart-tokenize-request') return;
      var v = currentValues();
      var errorEl = document.getElementById('error');
      if (!isValid(v)) {
        errorEl.textContent = 'Enter a valid card number, expiry, and CVC.';
        return;
      }
      errorEl.textContent = '';
      // A real hosted field posts the card details to the vendor's own tokenization
      // endpoint here and relays back only the resulting token — never the raw PAN.
      parent.postMessage({
        type: 'kart-payment-token',
        token: 'tok_mock_' + Math.random().toString(36).slice(2),
        brand: v.number.startsWith('4') ? 'visa' : 'mastercard',
        last4: v.number.slice(-4),
      }, '*');
    });
    reportValidity();
  </script>
</body>
</html>`;

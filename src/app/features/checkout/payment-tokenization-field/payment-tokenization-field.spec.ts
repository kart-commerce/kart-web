import { TestBed } from '@angular/core/testing';

import { PaymentToken, PaymentTokenizationField } from './payment-tokenization-field';

/**
 * `iframe.contentDocument.readyState === 'complete'` can report true for the iframe's initial
 * blank document a tick before `srcdoc` finishes parsing in — checking for the form's own
 * content, not just readyState, avoids a race that only shows up when many specs run together
 * and the timing shifts.
 */
function waitForFrameContent(iframe: HTMLIFrameElement): Promise<Document> {
  return new Promise((resolve) => {
    const check = () => {
      const doc = iframe.contentDocument;
      if (doc?.getElementById('name')) {
        resolve(doc);
        return true;
      }
      return false;
    };
    if (check()) {
      return;
    }
    iframe.addEventListener('load', () => {
      if (!check()) {
        // srcdoc content assigned after the initial `load` fires in some engines — poll briefly.
        const interval = setInterval(() => {
          if (check()) {
            clearInterval(interval);
          }
        }, 10);
      }
    });
  });
}

describe('PaymentTokenizationField', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [PaymentTokenizationField] });
  });

  it('never exposes a card-number FormControl on the host component', () => {
    const fixture = TestBed.createComponent(PaymentTokenizationField);
    // The whole point of the tokenization boundary: nothing on this component's own
    // instance holds card data — only the isolated iframe's internal document does.
    expect((fixture.componentInstance as unknown as { cardNumber?: unknown }).cardNumber).toBeUndefined();
  });

  it('emits a token, brand, and last4 in response to requestTokenization, filling in valid card details inside the isolated frame first', async () => {
    const fixture = TestBed.createComponent(PaymentTokenizationField);
    fixture.detectChanges();

    const iframe = fixture.nativeElement.querySelector('iframe') as HTMLIFrameElement;
    const doc = await waitForFrameContent(iframe);

    (doc.getElementById('name') as HTMLInputElement).value = 'Jordan Rivera';
    (doc.getElementById('number') as HTMLInputElement).value = '4242424242424242';
    (doc.getElementById('expiry') as HTMLInputElement).value = '12/29';
    (doc.getElementById('cvc') as HTMLInputElement).value = '123';

    const tokenPromise = new Promise<PaymentToken>((resolve) => {
      fixture.componentInstance.tokenized.subscribe((token) => resolve(token));
    });

    fixture.componentInstance.requestTokenization();

    const token = await tokenPromise;
    expect(token.token).toMatch(/^tok_mock_/);
    expect(token.brand).toBe('visa');
    expect(token.last4).toBe('4242');
  });
});

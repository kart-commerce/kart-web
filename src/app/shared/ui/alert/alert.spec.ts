import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Alert, AlertVariant } from './alert';

@Component({
  imports: [Alert],
  template: `<kart-alert [variant]="variant()">Something went wrong</kart-alert>`,
})
class HostComponent {
  readonly variant = signal<AlertVariant>('danger');
}

describe('Alert', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('renders the projected content and role="alert"', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('kart-alert') as HTMLElement;
    expect(host.getAttribute('role')).toBe('alert');
    expect(host.textContent).toContain('Something went wrong');
  });

  it('applies the variant class', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.variant.set('success');
    fixture.detectChanges();
    const inner = fixture.nativeElement.querySelector('.kart-alert') as HTMLElement;
    expect(inner.classList).toContain('kart-alert--success');
  });
});

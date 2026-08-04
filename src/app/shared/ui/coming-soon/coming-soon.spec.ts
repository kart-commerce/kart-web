import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ComingSoon } from './coming-soon';

@Component({
  imports: [ComingSoon],
  template: `<kart-coming-soon title="Returns" message="Return requests launch soon." />`,
})
class HostComponent {}

describe('ComingSoon', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  it('renders the given title and message', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    expect(host.textContent).toContain('Returns');
    expect(host.textContent).toContain('Return requests launch soon.');
  });
});

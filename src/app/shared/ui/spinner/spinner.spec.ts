import { TestBed } from '@angular/core/testing';

import { Spinner } from './spinner';

describe('Spinner', () => {
  it('exposes an accessible label via role="status"/aria-label', () => {
    TestBed.configureTestingModule({ imports: [Spinner] });
    const fixture = TestBed.createComponent(Spinner);
    fixture.componentRef.setInput('label', 'Loading categories');
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-label')).toBe('Loading categories');
  });
});

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ThemeToggle } from './theme-toggle';

@Component({
  imports: [ThemeToggle],
  template: `<kart-theme-toggle />`,
})
class HostComponent {}

describe('ThemeToggle', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    return { fixture, button };
  }

  beforeEach(() => {
    localStorage.removeItem('kart-theme');
    document.documentElement.removeAttribute('data-theme');
    // The real `prefers-color-scheme` result depends on the host OS/browser
    // running the suite, so it's stubbed to light for a deterministic default.
    const noop = (): void => undefined;
    spyOn(window, 'matchMedia').and.returnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: noop,
      removeEventListener: noop,
    } as unknown as MediaQueryList);
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });

  afterEach(() => {
    localStorage.removeItem('kart-theme');
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders the light theme by default with a sun icon', () => {
    const { button } = createHost();
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.getAttribute('aria-label')).toBe('Switch to dark theme');
    expect(button.textContent?.trim()).toBe('☀');
  });

  it('switches to the dark theme on click', () => {
    const { fixture, button } = createHost();
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Switch to light theme');
    expect(button.textContent?.trim()).toBe('☾');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('switches back to the light theme on a second click', () => {
    const { fixture, button } = createHost();
    button.click();
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();

    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

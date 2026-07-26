import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

/**
 * The real `prefers-color-scheme` result depends on the host OS/browser
 * running the suite (observed as `dark` in some CI/dev containers), so tests
 * that care about the "no stored preference" fallback stub it explicitly
 * rather than asserting on whatever the machine happens to report.
 */
function stubPrefersDark(matches: boolean): void {
  const noop = (): void => undefined;
  const stub = {
    matches,
    media: '(prefers-color-scheme: dark)',
    addEventListener: noop,
    removeEventListener: noop,
  } as unknown as MediaQueryList;

  const matchMedia = window.matchMedia;
  if (jasmine.isSpy(matchMedia)) {
    (matchMedia as jasmine.Spy).and.returnValue(stub);
  } else {
    spyOn(window, 'matchMedia').and.returnValue(stub);
  }
}

describe('ThemeService', () => {
  let meta: HTMLMetaElement;

  beforeEach(() => {
    localStorage.removeItem('kart-theme');
    document.documentElement.removeAttribute('data-theme');
    stubPrefersDark(false);

    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', '#2A6DF4');
    document.head.appendChild(meta);
  });

  afterEach(() => {
    localStorage.removeItem('kart-theme');
    document.documentElement.removeAttribute('data-theme');
    meta.remove();
  });

  it('defaults to light when there is no stored preference or existing data-theme attribute', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('follows the OS preference when there is no stored choice', () => {
    stubPrefersDark(true);

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
  });

  it('resolves the initial theme from a previously stored preference', () => {
    localStorage.setItem('kart-theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
  });

  it('picks up the data-theme attribute already applied by the index.html bootstrap script', () => {
    document.documentElement.setAttribute('data-theme', 'dark');

    const service = TestBed.inject(ThemeService);

    expect(service.theme()).toBe('dark');
  });

  it('toggle flips the theme, updates the DOM, and persists the choice', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();
    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(meta.getAttribute('content')).toBe('#0B1120');
    expect(localStorage.getItem('kart-theme')).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(meta.getAttribute('content')).toBe('#2A6DF4');
    expect(localStorage.getItem('kart-theme')).toBe('light');
  });

  it('setTheme sets an explicit theme regardless of the current one', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('dark');
    expect(service.theme()).toBe('dark');

    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
  });
});

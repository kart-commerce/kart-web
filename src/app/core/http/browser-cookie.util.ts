/**
 * Client-side `document.cookie` helpers for the small set of first-party,
 * `Necessary`/`Preference`-category cookies this app sets directly from the
 * browser (guest cart/wishlist session id, locale, currency, consent) —
 * privacy.md §A.1. Never used for the session cookie itself, which is
 * `HttpOnly` and therefore invisible to `document.cookie` by design
 * (security.md §1) — that one is set/read server-side only.
 */
export function readBrowserCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function writeBrowserCookie(name: string, value: string, maxAgeDays: number): void {
  const maxAgeSeconds = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function deleteBrowserCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0`;
}

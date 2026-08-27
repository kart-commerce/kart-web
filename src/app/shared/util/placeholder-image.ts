const PALETTE = ['#2A6DF4', '#0891B2', '#16A34A', '#D97706', '#DC2626', '#7C3AED'];

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(label: string): string {
  const words = label.trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Deterministic monogram placeholder (no product photography exists for the mock catalog).
 * Encoded as a data URI so it renders identically in SSR and offline dev, without a network call.
 */
export function placeholderImage(seed: string, label: string): string {
  const color = PALETTE[hashCode(seed) % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480">
    <rect width="480" height="480" fill="${color}" />
    <text x="240" y="264" font-family="Inter, system-ui, sans-serif" font-size="120" font-weight="700"
      fill="#FFFFFF" text-anchor="middle">${initials(label)}</text>
  </svg>`;
  // encodeURIComponent, not btoa - a product/brand name outside the Latin-1 range (e.g. CJK
  // characters, emoji) makes btoa throw InvalidCharacterError, which would crash this call's
  // entire enclosing map() and cascade into an outer catchError (surfacing as, e.g., a cart line
  // that looks "out of stock" when the real cause was an unencodable name).
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

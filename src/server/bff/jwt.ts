/**
 * Extracts the `sub` (subject/userId) claim from a JWT without verifying its signature — safe
 * here because this only ever runs server-side, immediately after `kart-identity-service`
 * itself issued the token over a trusted call; verification is Identity/Gateway's job, not a
 * second check this BFF needs to duplicate. Used only to know *which* userId to address
 * `kart-user-service` calls to — never trusted as an authorization decision.
 */
export function decodeJwtSubject(token: string): string | undefined {
  try {
    const [, payload] = token.split('.');
    if (!payload) {
      return undefined;
    }
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(normalized, 'base64').toString('utf-8');
    const claims = JSON.parse(json) as { sub?: string };
    return claims.sub;
  } catch {
    return undefined;
  }
}

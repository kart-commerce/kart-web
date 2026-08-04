import { DEFAULT_FEATURE_FLAGS, FeatureFlagKey, FeatureFlags } from './feature-flags';

const NON_PRODUCTION_DEFAULT_ON_ENVIRONMENTS = new Set(['development', 'qa']);

interface UnleashFeature {
  readonly name: string;
  readonly enabled: boolean;
}

interface UnleashClientFeaturesResponse {
  readonly features: readonly UnleashFeature[];
}

/**
 * Resolves every FeatureFlagKey once per SSR bootstrap/session (design-decisions.md
 * "Feature-Flag Resolution Timing & Lifecycle Management" — never re-checked
 * client-side for that tab's lifetime; a flip's effect lands on the tab's next
 * navigation-triggered SSR response).
 *
 * If `UNLEASH_URL` is configured, resolves from the real Unleash client-features API
 * (server-to-server, same-origin-network as the Gateway call); on any failure
 * (unreachable, malformed response, timeout) this fails open to the environment
 * default rather than ever throwing — an Unleash outage must never take down
 * feature resolution for the whole app, matching the platform's existing
 * fail-open philosophy for a non-critical dependency (api-strategy.md §6).
 */
export async function readServerFeatureFlags(): Promise<FeatureFlags> {
  const environmentDefaults = buildEnvironmentDefaults();

  const unleashUrl = process.env['UNLEASH_URL'];
  if (!unleashUrl) {
    return environmentDefaults;
  }

  try {
    const response = await fetch(`${unleashUrl}/api/client/features`, {
      headers: {
        Accept: 'application/json',
        ...(process.env['UNLEASH_API_TOKEN']
          ? { Authorization: process.env['UNLEASH_API_TOKEN'] }
          : {}),
      },
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      return environmentDefaults;
    }

    const body = (await response.json()) as UnleashClientFeaturesResponse;
    const byName = new Map(body.features.map((feature) => [feature.name, feature.enabled]));

    return Object.fromEntries(
      (Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]).map((key) => [
        key,
        byName.get(key) ?? environmentDefaults[key],
      ]),
    ) as FeatureFlags;
  } catch {
    return environmentDefaults;
  }
}

function buildEnvironmentDefaults(): FeatureFlags {
  const environment = (process.env['KART_ENVIRONMENT'] ?? 'production').toLowerCase();
  const defaultOn = NON_PRODUCTION_DEFAULT_ON_ENVIRONMENTS.has(environment);

  if (!defaultOn) {
    return DEFAULT_FEATURE_FLAGS;
  }

  return Object.fromEntries(
    (Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[]).map((key) => [key, true]),
  ) as FeatureFlags;
}

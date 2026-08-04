export type ConsentCategory = 'analytics' | 'marketing' | 'preference';

export interface ConsentCategories {
  readonly analytics: boolean;
  readonly marketing: boolean;
  readonly preference: boolean;
}

export interface ConsentRecord {
  readonly version: number;
  readonly categories: ConsentCategories;
  readonly timestamp: string;
}

/**
 * privacy.md §A.4 — bumped whenever the cookie-category list or purpose descriptions
 * materially change (e.g. a new Marketing sub-processor). A stored consent whose `version` is
 * older than this is treated as stale (edge-cases.md's resolved "next in-app navigation" rule).
 */
export const CONSENT_VERSION = 1;

export const ALL_CATEGORIES_ACCEPTED: ConsentCategories = { analytics: true, marketing: true, preference: true };
export const ALL_CATEGORIES_REJECTED: ConsentCategories = { analytics: false, marketing: false, preference: false };

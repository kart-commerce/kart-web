#!/usr/bin/env node
// WEB-7 — translation-completeness CI gate (localization.md §1): a missing bn/de key against
// the en bundle's key set fails the build. The runtime fallback-to-English path
// (translate.service.ts) exists only as a safety net for a bad hotfix/rollback race, never as
// expected production behavior for a genuinely missing key.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const translationsDir = join(__dirname, '../src/app/core/i18n/translations');

function loadKeys(locale) {
  const raw = readFileSync(join(translationsDir, `${locale}.json`), 'utf-8');
  return new Set(Object.keys(JSON.parse(raw)));
}

const enKeys = loadKeys('en');
const otherLocales = ['bn', 'de'];
let hasMissing = false;

for (const locale of otherLocales) {
  const keys = loadKeys(locale);
  const missing = [...enKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !enKeys.has(key));

  if (missing.length > 0) {
    hasMissing = true;
    console.error(`[translation-completeness] ${locale}.json is missing ${missing.length} key(s):`);
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
  }
  if (extra.length > 0) {
    console.warn(`[translation-completeness] ${locale}.json has ${extra.length} key(s) not present in en.json (stale?):`);
    for (const key of extra) {
      console.warn(`  - ${key}`);
    }
  }
}

if (hasMissing) {
  console.error('\nTranslation completeness check FAILED — every en.json key must exist in bn.json and de.json.');
  process.exit(1);
}

console.log(`Translation completeness check passed — ${enKeys.size} keys, ${otherLocales.length} locale(s) checked.`);

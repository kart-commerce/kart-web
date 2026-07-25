import { TestBed } from '@angular/core/testing';
import { TransferState } from '@angular/core';

import { APP_CONFIG, APP_CONFIG_STATE_KEY, DEFAULT_APP_CONFIG } from './app-config';
import { provideAppConfig } from './app-config.provider';

/**
 * Only the browser (TransferState-read) branch is exercised here — the
 * server branch reads `process.env`, which doesn't exist in Karma's browser
 * test environment (PLATFORM_ID defaults to 'browser' in TestBed, so the
 * server branch is never reached by these tests either way). The server
 * branch was verified against a real running backend via a manual SSR smoke
 * test (see PR description) rather than a Karma unit test.
 */
describe('provideAppConfig (browser)', () => {
  it('returns the value transferred from the server when present', () => {
    TestBed.configureTestingModule({ providers: [provideAppConfig()] });
    const transferState = TestBed.inject(TransferState);
    transferState.set(APP_CONFIG_STATE_KEY, { gatewayBaseUrl: 'https://gateway.example.com' });

    expect(TestBed.inject(APP_CONFIG)).toEqual({ gatewayBaseUrl: 'https://gateway.example.com' });
  });

  it('falls back to DEFAULT_APP_CONFIG when nothing was transferred', () => {
    TestBed.configureTestingModule({ providers: [provideAppConfig()] });
    expect(TestBed.inject(APP_CONFIG)).toEqual(DEFAULT_APP_CONFIG);
  });
});

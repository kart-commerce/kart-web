import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { APP_CONFIG, DEFAULT_APP_CONFIG } from '../config/app-config';
import { SERVICE_ENDPOINTS } from '../config/service-endpoints';
import { BASE_PATH as CART_BASE_PATH } from './generated/cart/v1/variables';
import { BASE_PATH as CATEGORY_BASE_PATH } from './generated/category/v1/variables';
import { BASE_PATH as USER_BASE_PATH } from './generated/user/v1/variables';
import { BASE_PATH as WISHLIST_BASE_PATH } from './generated/wishlist/v1/variables';
import { provideGeneratedApiClients } from './generated-clients.provider';

describe('provideGeneratedApiClients', () => {
  function basePathFor(token: unknown, platformId: 'browser' | 'server') {
    TestBed.configureTestingModule({
      providers: [
        provideGeneratedApiClients(),
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: APP_CONFIG, useValue: DEFAULT_APP_CONFIG },
      ],
    });
    return TestBed.inject(token as never) as string;
  }

  it('does not double up /v1 for a public service whose contract path already embeds it (product)', () => {
    expect(basePathFor(CART_BASE_PATH, 'browser')).toBe('/api/bff/gateway');
  });

  it('keeps the /v1 suffix for a public service whose contract path omits it (category)', () => {
    expect(basePathFor(CATEGORY_BASE_PATH, 'browser')).toBe('/v1');
  });

  it('keeps the /v1 suffix for an auth-capable service whose contract path omits it (wishlist)', () => {
    expect(basePathFor(WISHLIST_BASE_PATH, 'browser')).toBe('/api/bff/gateway/v1');
  });

  it('does not double up /v1 for an auth-capable service whose contract path already embeds it (user)', () => {
    expect(basePathFor(USER_BASE_PATH, 'browser')).toBe('/api/bff/gateway');
  });

  it('calls the gateway directly on the server without doubling /v1 (v1-embedded contract)', () => {
    expect(basePathFor(CART_BASE_PATH, 'server')).toBe(SERVICE_ENDPOINTS.gateway);
  });

  it('calls the gateway directly on the server, appending /v1 for a contract that omits it', () => {
    expect(basePathFor(CATEGORY_BASE_PATH, 'server')).toBe(`${SERVICE_ENDPOINTS.gateway}/v1`);
  });
});

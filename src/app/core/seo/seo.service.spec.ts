import { TestBed } from '@angular/core/testing';

import { SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    document.getElementById('kart-canonical-link')?.remove();
    document.getElementById('kart-structured-data')?.remove();
  });

  it('sets a titled page title suffixed with the brand name', () => {
    service.setTitle('Aura Phone 15 Pro');
    expect(document.title).toBe('Aura Phone 15 Pro | Kart');
  });

  it('creates exactly one canonical link tag and updates it in place on repeated calls', () => {
    service.setCanonicalUrl('https://kart.example/en/p/abc');
    service.setCanonicalUrl('https://kart.example/en/p/abc?page=2');

    const links = document.querySelectorAll('link#kart-canonical-link');
    expect(links.length).toBe(1);
    expect((links[0] as HTMLLinkElement).href).toBe('https://kart.example/en/p/abc?page=2');
  });

  it('writes exactly one JSON-LD structured-data script, replaced wholesale on re-set', () => {
    service.setStructuredData({ '@type': 'Product', name: 'Aura Phone' });
    service.setStructuredData({ '@type': 'Product', name: 'ZenBook Air' });

    const scripts = document.querySelectorAll('script#kart-structured-data');
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent ?? '{}').name).toBe('ZenBook Air');
  });
});

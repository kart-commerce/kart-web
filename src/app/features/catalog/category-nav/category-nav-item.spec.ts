import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CategoryNavItem } from './category-nav-item';
import { CategoryTreeNode } from './category-tree-node';

const leaf: CategoryTreeNode = {
  categoryId: 'laptops',
  name: 'Laptops',
  depth: 4,
  status: 'active',
  ancestorPath: ['electronics'],
};

const expandable: CategoryTreeNode = {
  categoryId: 'electronics',
  name: 'Electronics',
  depth: 1,
  status: 'active',
  ancestorPath: [],
};

describe('CategoryNavItem', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CategoryNavItem],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('renders a link to the category placeholder route', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', leaf);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toContain('Laptops');
    expect(link.getAttribute('href')).toBe('/c/laptops');
  });

  it('shows no expand toggle for a depth-4 leaf node', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', leaf);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('does not fetch children until expanded', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', expandable);
    fixture.detectChanges();

    const requests = httpMock.match((r) => r.params.get('parentId') === 'electronics');
    expect(requests.length).toBe(0);
  });

  it('fetches children lazily on first expand and toggles visibility', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', expandable);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul')).toBeNull();

    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    const req = httpMock.expectOne((r) => r.params.get('parentId') === 'electronics');
    req.flush([{ categoryId: 'laptops', name: 'Laptops', depth: 2, status: 'active', ancestorPath: ['electronics'] }]);
    fixture.detectChanges();

    const childList = fixture.nativeElement.querySelector('ul');
    expect(childList).toBeTruthy();
    expect(childList.textContent).toContain('Laptops');
  });

  it('does not re-fetch children on subsequent expand/collapse toggles', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', expandable);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();
    httpMock.expectOne((r) => r.params.get('parentId') === 'electronics').flush([]);
    fixture.detectChanges();

    toggle.click();
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    const requests = httpMock.match((r) => r.params.get('parentId') === 'electronics');
    expect(requests.length).toBe(0);
  });

  it('shows a graceful error message when the child fetch fails', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', expandable);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.params.get('parentId') === 'electronics')
      .flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Subcategories are unavailable right now.');
  });
});

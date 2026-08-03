import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Category } from '../../../core/http/generated/category/v1/model/category';
import { CategoryNavService } from './category-nav.service';
import { CategoryTreeNode } from './category-tree-node';

function category(overrides: Partial<Category> & Pick<Category, 'categoryId' | 'name' | 'depth'>): Category {
  return { status: 'active', ancestorPath: [], ...overrides };
}

describe('CategoryNavService', () => {
  let service: CategoryNavService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CategoryNavService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loadRoot fetches only the root level in a single request', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadRoot().subscribe((tree) => (result = tree));

    const req = httpMock.expectOne((r) => r.url.endsWith('/categories') && !r.params.has('parentId'));
    req.flush([category({ categoryId: 'electronics', name: 'Electronics', depth: 1 })]);

    expect(result).toEqual([
      { categoryId: 'electronics', name: 'Electronics', depth: 1, status: 'active', ancestorPath: [] },
    ]);
  });

  it('loadRoot filters out deprecated top-level categories', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadRoot().subscribe((tree) => (result = tree));

    httpMock
      .expectOne((r) => r.url.endsWith('/categories') && !r.params.has('parentId'))
      .flush([category({ categoryId: 'electronics', name: 'Electronics', depth: 1, status: 'deprecated' })]);

    expect(result).toEqual([]);
  });

  it('loadChildren fetches only the requested parent in a single request, with no recursion', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadChildren('electronics').subscribe((tree) => (result = tree));

    const req = httpMock.expectOne((r) => r.params.get('parentId') === 'electronics');
    req.flush([category({ categoryId: 'laptops', name: 'Laptops', depth: 2 })]);

    expect(result).toEqual([
      { categoryId: 'laptops', name: 'Laptops', depth: 2, status: 'active', ancestorPath: [] },
    ]);
    httpMock.expectNone((r) => r.params.get('parentId') === 'laptops');
  });
});

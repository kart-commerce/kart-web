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

  function flushRootLevel(categories: Category[]) {
    const [req] = httpMock.match((r) => r.url.endsWith('/categories') && !r.params.has('parentId'));
    req?.flush(categories);
  }

  it('returns an empty tree when there are no top-level categories', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadTree().subscribe((tree) => (result = tree));

    flushRootLevel([]);

    expect(result).toEqual([]);
  });

  it('filters out deprecated top-level categories', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadTree().subscribe((tree) => (result = tree));

    flushRootLevel([
      category({ categoryId: 'electronics', name: 'Electronics', depth: 1, status: 'deprecated' }),
    ]);

    expect(result).toEqual([]);
  });

  it('fetches a leaf node (depth 4) without an extra child-probe request', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadTree().subscribe((tree) => (result = tree));

    flushRootLevel([category({ categoryId: 'leaf', name: 'Leaf', depth: 4 })]);

    expect(result).toEqual([{ categoryId: 'leaf', name: 'Leaf', depth: 4, status: 'active', ancestorPath: [], children: [] }]);
    httpMock.expectNone((r) => r.params.has('parentId'));
  });

  it('recursively fetches children in parallel and builds the tree', () => {
    let result: readonly CategoryTreeNode[] | undefined;
    service.loadTree().subscribe((tree) => (result = tree));

    flushRootLevel([
      category({ categoryId: 'electronics', name: 'Electronics', depth: 1 }),
      category({ categoryId: 'fashion', name: 'Fashion', depth: 1 }),
    ]);

    const electronicsChildrenReq = httpMock.expectOne(
      (r) => r.params.get('parentId') === 'electronics',
    );
    const fashionChildrenReq = httpMock.expectOne((r) => r.params.get('parentId') === 'fashion');

    // depth 4 so this leaf doesn't trigger yet another (unflushed) child-probe request.
    electronicsChildrenReq.flush([category({ categoryId: 'laptops', name: 'Laptops', depth: 4 })]);
    fashionChildrenReq.flush([]);

    expect(result).toEqual([
      {
        categoryId: 'electronics',
        name: 'Electronics',
        depth: 1,
        status: 'active',
        ancestorPath: [],
        children: [
          {
            categoryId: 'laptops',
            name: 'Laptops',
            depth: 4,
            status: 'active',
            ancestorPath: [],
            children: [],
          },
        ],
      },
      {
        categoryId: 'fashion',
        name: 'Fashion',
        depth: 1,
        status: 'active',
        ancestorPath: [],
        children: [],
      },
    ]);
  });
});

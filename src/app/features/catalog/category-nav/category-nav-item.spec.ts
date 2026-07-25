import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CategoryNavItem } from './category-nav-item';
import { CategoryTreeNode } from './category-tree-node';

const leaf: CategoryTreeNode = {
  categoryId: 'laptops',
  name: 'Laptops',
  depth: 2,
  status: 'active',
  ancestorPath: ['electronics'],
  children: [],
};

const withChildren: CategoryTreeNode = {
  categoryId: 'electronics',
  name: 'Electronics',
  depth: 1,
  status: 'active',
  ancestorPath: [],
  children: [leaf],
};

describe('CategoryNavItem', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CategoryNavItem],
      providers: [provideRouter([])],
    });
  });

  it('renders a link to the category placeholder route', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', leaf);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link.textContent).toContain('Laptops');
    expect(link.getAttribute('href')).toBe('/c/laptops');
  });

  it('shows no expand toggle for a node with no children', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', leaf);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('toggles child visibility via the expand button', () => {
    const fixture = TestBed.createComponent(CategoryNavItem);
    fixture.componentRef.setInput('node', withChildren);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul')).toBeNull();

    const toggle = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const childList = fixture.nativeElement.querySelector('ul');
    expect(childList).toBeTruthy();
    expect(childList.textContent).toContain('Laptops');
  });
});

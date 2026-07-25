import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { CategoryPlaceholderPage } from './category-placeholder-page';

describe('CategoryPlaceholderPage', () => {
  it('renders the categoryId from the route params', () => {
    TestBed.configureTestingModule({
      imports: [CategoryPlaceholderPage],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ categoryId: 'electronics' })) },
        },
      ],
    });

    const fixture = TestBed.createComponent(CategoryPlaceholderPage);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Category electronics');
  });
});

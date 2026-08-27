import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ConsentCategoriesForm } from './consent-categories';

@Component({
  imports: [ConsentCategoriesForm],
  template: `<kart-consent-categories [initial]="{ analytics: true, marketing: false, preference: true }" />`,
})
class HostWithInitial {}

describe('ConsentCategoriesForm', () => {
  it('pre-fills toggle state from a template-bound initial input', () => {
    const fixture = TestBed.createComponent(HostWithInitial);
    fixture.detectChanges();

    const form = fixture.debugElement.children[0].componentInstance as ConsentCategoriesForm;
    expect(form.analytics()).toBe(true);
    expect(form.marketing()).toBe(false);
    expect(form.preference()).toBe(true);
  });

  it('emits the current toggle state on save', () => {
    const fixture = TestBed.createComponent(ConsentCategoriesForm);
    fixture.detectChanges();

    let emitted: unknown;
    fixture.componentInstance.saved.subscribe((value) => (emitted = value));

    fixture.componentInstance.analytics.set(true);
    fixture.componentInstance.marketing.set(true);
    fixture.componentInstance.save();

    expect(emitted).toEqual({ analytics: true, marketing: true, preference: false });
  });

  it('renders a checkbox row per category plus the always-on Necessary row', () => {
    const fixture = TestBed.createComponent(ConsentCategoriesForm);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(4);
    expect((checkboxes[0] as HTMLInputElement).disabled).toBe(true);
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AddItemInput } from './add-item-input';

function setup() {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(AddItemInput);
  fixture.detectChanges();
  return fixture;
}

function inputs(fixture: ReturnType<typeof setup>) {
  const els = fixture.nativeElement.querySelectorAll<HTMLInputElement>('input.field');
  return { name: els[0]!, amount: els[1]! };
}

function fireInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AddItemInput', () => {
  it('does not emit when the name is blank', () => {
    const fixture = setup();
    const handler = vi.fn();
    fixture.componentInstance.add.subscribe(handler);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(handler).not.toHaveBeenCalled();
  });

  it('emits a trimmed draft when the form is submitted', () => {
    const fixture = setup();
    const handler = vi.fn();
    fixture.componentInstance.add.subscribe(handler);

    const { name, amount } = inputs(fixture);
    fireInput(name, '  Avocados  ');
    fireInput(amount, '  2 pcs  ');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(handler).toHaveBeenCalledWith({ name: 'Avocados', amount: '2 pcs' });
  });

  it('clears both fields after a successful submit', () => {
    const fixture = setup();
    const { name, amount } = inputs(fixture);
    fireInput(name, 'Milk');
    fireInput(amount, '1 L');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    const after = inputs(fixture);
    expect(after.name.value).toBe('');
    expect(after.amount.value).toBe('');
  });
});

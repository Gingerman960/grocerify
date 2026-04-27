import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { mockItem } from '@testing/factories';

import { GroceryItemRowEdit } from './grocery-item-row-edit';

async function setup(item = mockItem({ id: 'a', name: 'Sourdough bread', amount: '1 loaf' })) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(GroceryItemRowEdit);
  fixture.componentRef.setInput('item', item);
  fixture.detectChanges();
  // afterNextRender seeds the model; flush the microtask + a second CD pass
  // so the inputs reflect the seeded values.
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

function inputs(fixture: Awaited<ReturnType<typeof setup>>) {
  const els = fixture.nativeElement.querySelectorAll<HTMLInputElement>('input.field');
  return { name: els[0]!, amount: els[1]! };
}

function fireInput(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('GroceryItemRowEdit', () => {
  it('seeds the inputs from the item on first render', async () => {
    const fixture = await setup(mockItem({ name: 'Milk', amount: '2 L' }));
    const { name, amount } = inputs(fixture);
    expect(name.value).toBe('Milk');
    expect(amount.value).toBe('2 L');
  });

  it('focuses the name input after mount (selection is browser-only and not asserted)', async () => {
    const fixture = await setup();
    const { name } = inputs(fixture);
    expect(document.activeElement).toBe(name);
  });

  it('emits commit with trimmed values on form submit', async () => {
    const fixture = await setup(mockItem({ id: 'xyz' }));
    const { name, amount } = inputs(fixture);
    fireInput(name, '  Whole milk  ');
    fireInput(amount, '  1 L  ');
    fixture.detectChanges();

    const handler = vi.fn();
    fixture.componentInstance.commit.subscribe(handler);
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(handler).toHaveBeenCalledWith({ id: 'xyz', name: 'Whole milk', amount: '1 L' });
  });

  it('does NOT emit commit when the name is whitespace-only', async () => {
    const fixture = await setup();
    const { name } = inputs(fixture);
    fireInput(name, '');
    fixture.detectChanges();

    const handler = vi.fn();
    fixture.componentInstance.commit.subscribe(handler);
    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    fixture.detectChanges();

    expect(handler).not.toHaveBeenCalled();
  });

  it('disables the Save button when the form is invalid', async () => {
    const fixture = await setup();
    const { name } = inputs(fixture);
    fireInput(name, '');
    fixture.detectChanges();

    const save = fixture.nativeElement.querySelector('.btn--save') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('emits cancelled when the Cancel button is clicked', async () => {
    const fixture = await setup();
    const handler = vi.fn();
    fixture.componentInstance.cancelled.subscribe(handler);
    (fixture.nativeElement.querySelector('.btn--cancel') as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('emits cancelled on Escape key', async () => {
    const fixture = await setup();
    const handler = vi.fn();
    fixture.componentInstance.cancelled.subscribe(handler);
    fixture.nativeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

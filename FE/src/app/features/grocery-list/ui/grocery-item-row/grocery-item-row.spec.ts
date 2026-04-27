import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { mockItem } from '@testing/factories';

import { GroceryItemRow } from './grocery-item-row';

function setup(item = mockItem()) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(GroceryItemRow);
  fixture.componentRef.setInput('item', item);
  fixture.detectChanges();
  return fixture;
}

describe('GroceryItemRow', () => {
  it('renders the name and amount', () => {
    const fixture = setup(mockItem({ name: 'Milk', amount: '2 L' }));
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Milk');
    expect(text).toContain('2 L');
  });

  it('strikes through the name when bought', () => {
    const fixture = setup(mockItem({ name: 'Milk', bought: true }));
    const name = fixture.nativeElement.querySelector('.name') as HTMLElement;
    expect(name.classList.contains('name--struck')).toBe(true);
  });

  it('emits toggleBought with the item id when the checkbox is clicked', () => {
    const fixture = setup(mockItem({ id: 'xyz' }));
    const handler = vi.fn();
    fixture.componentInstance.toggleBought.subscribe(handler);
    (fixture.nativeElement.querySelector('.check') as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledWith('xyz');
  });

  it('emits startEdit and remove from their action buttons', () => {
    const fixture = setup(mockItem({ id: 'xyz' }));
    const editHandler = vi.fn();
    const removeHandler = vi.fn();
    fixture.componentInstance.startEdit.subscribe(editHandler);
    fixture.componentInstance.remove.subscribe(removeHandler);
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('.icon-btn'),
    );
    buttons[0]?.click();
    buttons[1]?.click();
    expect(editHandler).toHaveBeenCalledWith('xyz');
    expect(removeHandler).toHaveBeenCalledWith('xyz');
  });

  it('exposes accessible drag-handle and checkbox labels', () => {
    const fixture = setup(mockItem({ name: 'Milk' }));
    const handle = fixture.nativeElement.querySelector('.handle') as HTMLButtonElement;
    const check = fixture.nativeElement.querySelector('.check') as HTMLButtonElement;
    expect(handle.getAttribute('aria-label')).toBe('Reorder item');
    expect(check.getAttribute('aria-label')).toContain('Mark Milk');
    expect(check.getAttribute('aria-checked')).toBe('false');
  });
});

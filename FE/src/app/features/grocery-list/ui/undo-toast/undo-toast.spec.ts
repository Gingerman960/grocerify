import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UndoToast } from './undo-toast';

function setup(itemName = 'Olive oil', durationMs = 5000) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(UndoToast);
  fixture.componentRef.setInput('itemName', itemName);
  fixture.componentRef.setInput('durationMs', durationMs);
  fixture.detectChanges();
  return fixture;
}

function barTransform(fixture: ReturnType<typeof setup>): string {
  return (fixture.nativeElement.querySelector('.bar-fill') as HTMLElement).style.transform;
}

describe('UndoToast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the item name in bold', () => {
    const fixture = setup('Olive oil');
    const text = fixture.nativeElement.querySelector('.text') as HTMLElement;
    expect(text.textContent).toContain('Olive oil');
    expect(text.querySelector('strong')?.textContent).toBe('Olive oil');
  });

  it('emits undo when the Undo button is clicked', () => {
    const fixture = setup();
    const handler = vi.fn();
    fixture.componentInstance.undo.subscribe(handler);
    (fixture.nativeElement.querySelector('.undo') as HTMLButtonElement).click();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('starts the countdown bar fully extended', () => {
    const fixture = setup();
    expect(barTransform(fixture)).toBe('scaleX(1)');
  });

  it('shrinks the countdown bar as time passes (one 200 ms tick at a time)', () => {
    // Each interval tick adds 200 ms to elapsed; ratio = (duration - elapsed) / duration.
    const fixture = setup('X', 1000);
    vi.advanceTimersByTime(600); // 3 ticks fired → elapsed 600 → ratio 0.4
    fixture.detectChanges();
    expect(barTransform(fixture)).toBe('scaleX(0.4)');
  });

  it('clamps the bar to scaleX(0) once the full duration has elapsed', () => {
    const fixture = setup('X', 1000);
    vi.advanceTimersByTime(1200); // overshoots; ratio is clamped at 0
    fixture.detectChanges();
    expect(barTransform(fixture)).toBe('scaleX(0)');
  });

  it('exposes accessible role and Undo button label', () => {
    const fixture = setup('X');
    const toast = fixture.nativeElement.querySelector('.toast') as HTMLElement;
    const undo = fixture.nativeElement.querySelector('.undo') as HTMLButtonElement;
    expect(toast.getAttribute('role')).toBe('status');
    expect(undo.textContent?.trim()).toBe('Undo');
    expect(undo.getAttribute('type')).toBe('button');
  });
});

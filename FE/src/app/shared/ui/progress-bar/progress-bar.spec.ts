import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ProgressBar } from './progress-bar';

function setup(progress: { total: number; bought: number; ratio: number }) {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(ProgressBar);
  fixture.componentRef.setInput('progress', progress);
  fixture.detectChanges();
  return fixture;
}

describe('ProgressBar', () => {
  it('sets the fill width to the rounded ratio percentage', () => {
    const fixture = setup({ total: 8, bought: 3, ratio: 3 / 8 });
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('38%');
  });

  it('renders 0% width and aria-valuenow=0 when the list is empty', () => {
    const fixture = setup({ total: 0, bought: 0, ratio: 0 });
    const fill = fixture.nativeElement.querySelector('.fill') as HTMLElement;
    const track = fixture.nativeElement.querySelector('.track') as HTMLElement;
    expect(fill.style.width).toBe('0%');
    expect(track.getAttribute('aria-valuenow')).toBe('0');
  });

  it('exposes accessible bought/total in the aria-label', () => {
    const fixture = setup({ total: 5, bought: 2, ratio: 2 / 5 });
    const track = fixture.nativeElement.querySelector('.track') as HTMLElement;
    expect(track.getAttribute('aria-label')).toBe('Bought 2 of 5');
  });
});

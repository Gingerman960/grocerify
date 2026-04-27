import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';

const TICK_MS = 200;

@Component({
  selector: 'app-undo-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast" role="status">
      <span class="text"
        ><strong>{{ itemName() }}</strong> deleted</span
      >
      <span class="divider" aria-hidden="true"></span>
      <button type="button" class="undo" (click)="undo.emit()">Undo</button>
      <span class="bar" aria-hidden="true">
        <span class="bar-fill" [style.transform]="'scaleX(' + ratio() + ')'"></span>
      </span>
    </div>
  `,
  styleUrl: './undo-toast.scss',
})
export class UndoToast {
  readonly itemName = input.required<string>();
  readonly durationMs = input<number>(5000);
  readonly undo = output<void>();

  readonly #elapsed = signal(0);
  protected readonly ratio = computed(() => {
    const left = Math.max(0, this.durationMs() - this.#elapsed());
    return left / this.durationMs();
  });

  constructor() {
    interval(TICK_MS)
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.#elapsed.update((v) => v + TICK_MS));
  }
}

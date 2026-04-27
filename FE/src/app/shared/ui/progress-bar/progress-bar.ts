import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type Progress = {
  readonly total: number;
  readonly bought: number;
  readonly ratio: number;
};

@Component({
  selector: 'app-progress-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="track"
      role="progressbar"
      [attr.aria-valuemin]="0"
      [attr.aria-valuemax]="100"
      [attr.aria-valuenow]="pct()"
      [attr.aria-label]="'Bought ' + progress().bought + ' of ' + progress().total"
    >
      <div class="fill" [style.width.%]="pct()"></div>
    </div>
  `,
  styleUrl: './progress-bar.scss',
})
export class ProgressBar {
  readonly progress = input.required<Progress>();

  protected readonly pct = computed(() => Math.round(this.progress().ratio * 100));
}

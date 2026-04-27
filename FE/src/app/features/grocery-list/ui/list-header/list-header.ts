import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ProgressBar, Progress } from '@app/shared/ui/progress-bar/progress-bar';

@Component({
  selector: 'app-list-header',
  imports: [ProgressBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = progress();
    <header class="header">
      <div class="left">
        <h1 class="title">My Grocery List</h1>
      </div>
      <div class="right">
        <div class="counts">
          <span><strong>{{ p.bought }}</strong> of {{ p.total }} bought</span>
          <span class="pct">{{ pct() }}%</span>
        </div>
        <app-progress-bar [progress]="p" />
      </div>
    </header>
  `,
  styleUrl: './list-header.scss',
})
export class ListHeader {
  readonly progress = input.required<Progress>();

  protected readonly pct = computed(() => Math.round(this.progress().ratio * 100));
}

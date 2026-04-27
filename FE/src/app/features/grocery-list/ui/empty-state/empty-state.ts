import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Icon } from '@app/shared/ui/icon/icon';

@Component({
  selector: 'app-empty-state',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <div class="orb">
        <app-icon name="basket" [size]="20" />
      </div>
      <div>
        <p class="title">Your list is empty</p>
        <p class="hint">Add your first item above — amounts are optional.</p>
      </div>
    </div>
  `,
  styleUrl: './empty-state.scss',
})
export class EmptyState {}

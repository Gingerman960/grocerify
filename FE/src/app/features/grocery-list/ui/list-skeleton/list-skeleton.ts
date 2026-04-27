import { ChangeDetectionStrategy, Component } from '@angular/core';

import { Icon } from '@app/shared/ui/icon/icon';

const SKELETON_WIDTHS = [48, 62, 40, 55, 35] as const;

@Component({
  selector: 'app-list-skeleton',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card" aria-busy="true" aria-live="polite" aria-label="Loading list">
      @for (w of widths; track $index) {
        <div class="row">
          <span class="handle"><app-icon name="drag" /></span>
          <span class="check"></span>
          <span class="name shimmer" [style.width.%]="w"></span>
          <span class="amount shimmer"></span>
        </div>
      }
    </div>
  `,
  styleUrl: './list-skeleton.scss',
})
export class ListSkeleton {
  protected readonly widths = SKELETON_WIDTHS;
}

import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Icon } from '@app/shared/ui/icon/icon';

@Component({
  selector: 'app-error-banner',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="banner" role="alert" aria-live="assertive">
      <app-icon name="alert" [size]="15" />
      <span class="msg">{{ message() }}</span>
      <button type="button" class="retry" (click)="retry.emit()">
        <app-icon name="refresh" [size]="12" />
        Retry
      </button>
    </div>
  `,
  styleUrl: './error-banner.scss',
})
export class ErrorBanner {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}

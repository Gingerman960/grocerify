import { ChangeDetectionStrategy, Component, input } from '@angular/core';

type IconName =
  | 'check'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'drag'
  | 'x'
  | 'kebab'
  | 'alert'
  | 'refresh'
  | 'basket';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.html',
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      line-height: 0;
      color: currentColor;
    }
    svg {
      display: block;
    }
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<number>(16);
  readonly strokeWidth = input<number>(1.5);
}

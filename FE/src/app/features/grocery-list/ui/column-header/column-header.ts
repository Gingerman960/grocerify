import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-column-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row" aria-hidden="true">
      <span class="cell cell--handle"></span>
      <span class="cell cell--check"></span>
      <span class="cell cell--name">Item</span>
      <span class="cell cell--amount">Amount</span>
      <span class="cell cell--actions"></span>
    </div>
  `,
  styleUrl: './column-header.scss',
})
export class ColumnHeader {}

import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { GroceryItem } from '@app/features/grocery-list/data-access/grocery-list.types';
import { Icon } from '@app/shared/ui/icon/icon';

@Component({
  selector: 'app-grocery-item-row',
  imports: [Icon, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.row--bought]': 'item().bought',
  },
  templateUrl: './grocery-item-row.html',
  styleUrl: './grocery-item-row.scss',
})
export class GroceryItemRow {
  readonly item = input.required<GroceryItem>();

  readonly toggleBought = output<string>();
  readonly startEdit = output<string>();
  readonly remove = output<string>();
}

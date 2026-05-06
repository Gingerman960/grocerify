import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AddItemInput } from '../ui/add-item-input/add-item-input';
import { ColumnHeader } from '../ui/column-header/column-header';
import { EmptyState } from '../ui/empty-state/empty-state';
import { ErrorBanner } from '../ui/error-banner/error-banner';
import {
  EditCommit,
  GroceryItemRowEdit,
} from '../ui/grocery-item-row/grocery-item-row-edit';
import { GroceryItemRow } from '../ui/grocery-item-row/grocery-item-row';
import { ListHeader } from '../ui/list-header/list-header';
import { ListSkeleton } from '../ui/list-skeleton/list-skeleton';
import { UndoToast } from '../ui/undo-toast/undo-toast';
import { GroceryListStore } from '../data-access/grocery-list.store';
import { SearchComponent } from '../ui/search/search';

@Component({
  selector: 'app-grocery-list-page',
  imports: [
    CdkDropList,
    CdkDrag,
    AddItemInput,
    SearchComponent,
    ColumnHeader,
    EmptyState,
    ErrorBanner,
    GroceryItemRow,
    GroceryItemRowEdit,
    ListHeader,
    ListSkeleton,
    UndoToast,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grocery-list-page.html',
  styleUrl: './grocery-list-page.scss',
})
export class GroceryListPage {
  protected readonly store = inject(GroceryListStore);

  protected readonly itemCountLabel = computed(() => {
    const n = this.store.entities().length;
    return `${n} ${n === 1 ? 'item' : 'items'}`;
  });

  protected onDrop(event: CdkDragDrop<unknown>): void {
    this.store.reorder({
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }

  protected onCommitEdit(commit: EditCommit): void {
    this.store.editItem(commit);
  }
}

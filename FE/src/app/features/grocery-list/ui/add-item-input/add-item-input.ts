import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import { Icon } from '@app/shared/ui/icon/icon';
import { GroceryItemDraft } from '@app/features/grocery-list/data-access/grocery-list.types';

const empty: GroceryItemDraft = { name: '', amount: '' };

@Component({
  selector: 'app-add-item-input',
  imports: [Icon, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-item-input.html',
  styleUrl: './add-item-input.scss',
})
export class AddItemInput {
  readonly add = output<GroceryItemDraft>();

  protected readonly model = signal<GroceryItemDraft>({ ...empty });
  protected readonly addForm = form(this.model, (p) => {
    required(p.name, { message: 'Name is required' });
  });

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.addForm().valid()) return;
    const draft = this.model();
    if (!draft.name.trim()) return;
    this.add.emit({ name: draft.name.trim(), amount: draft.amount.trim() });
    this.model.set({ ...empty });
    this.nameInput().nativeElement.focus();
  }
}

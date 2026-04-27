import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import { GroceryItem } from '@app/features/grocery-list/data-access/grocery-list.types';
import { Icon } from '@app/shared/ui/icon/icon';

export type EditCommit = { readonly id: string; readonly name: string; readonly amount: string };

@Component({
  selector: 'app-grocery-item-row-edit',
  imports: [FormField, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grocery-item-row-edit.html',
  styleUrl: './grocery-item-row-edit.scss',
})
export class GroceryItemRowEdit {
  readonly item = input.required<GroceryItem>();
  readonly commit = output<EditCommit>();
  readonly cancelled = output<void>();

  protected readonly model = signal<{ name: string; amount: string }>({ name: '', amount: '' });
  protected readonly editForm = form(this.model, (p) => {
    required(p.name, { message: 'Name is required' });
  });

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    afterNextRender(() => {
      const i = this.item();
      this.model.set({ name: i.name, amount: i.amount });
      const el = this.nameInput().nativeElement;
      el.focus();
      el.select();
    });
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.editForm().valid()) return;
    const { name, amount } = this.model();
    this.commit.emit({ id: this.item().id, name: name.trim(), amount: amount.trim() });
  }

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    event.preventDefault();
    this.cancelled.emit();
  }
}

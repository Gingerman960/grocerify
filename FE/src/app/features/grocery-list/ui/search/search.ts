import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

@Component({
  selector: 'app-search',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './search.html',
  styleUrl: './search.scss',
})
export class SearchComponent {
  readonly search = output<string>();

  protected readonly model = signal({ search: '' });
  protected readonly searchForm = form(this.model, (p) => {
    required(p.search, { message: 'Search query is required' });
  });

  private readonly searchQuery = viewChild.required<ElementRef<HTMLInputElement>>('searchQuery');

  protected onSubmit(event: Event): void {
    event.preventDefault();
    if (!this.searchForm().valid()) return;
    const draft = this.model().search;
    if (!draft.trim()) return;
    this.search.emit(draft.trim());
  }
}

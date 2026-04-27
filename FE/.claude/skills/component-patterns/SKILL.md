---
name: component-patterns
description: Component patterns — smart container vs dumb presentational, signal inputs/outputs, change detection. Load this skill when creating any new component, when uncertain about whether a component should inject the store, when the user asks about "smart vs dumb components" / "container components" / "presentational components", or when reviewing a component for compliance with project rules.
---

# Component patterns

Two component types only: **smart** (in `feature/`) and **dumb** (in `ui/`). Different rules for each.

## Smart components (feature/)

Inject the store, render dumb components, wire handlers. Thin.

```ts
@Component({
  selector: 'app-grocery-list-page',
  imports: [GroceryItemRow, ProgressBar, AddItemInput, EmptyState, ListSkeleton, ErrorBanner],
  template: `
    <header class="header">
      <h1>My grocery list</h1>
      <app-progress-bar [progress]="store.progress()" />
    </header>

    <app-add-item-input (add)="store.addItem($event)" />

    @if (store.isLoading()) {
      <app-list-skeleton />
    } @else if (store.error(); as err) {
      <app-error-banner [message]="err" (retry)="store.loadAll()" />
    } @else {
      <ul cdkDropList (cdkDropListDropped)="onDrop($event)">
        @for (item of store.sortedItems(); track item.id) {
          <app-grocery-item-row
            [item]="item"
            (toggle)="store.toggleBought($event)"
            (edit)="store.editItem($event)"
            (delete)="store.deleteItem($event)"
          />
        } @empty {
          <app-empty-state />
        }
      </ul>
    }
  `,
})
export class GroceryListPage {
  protected readonly store = inject(GroceryListStore);

  protected onDrop(event: CdkDragDrop<unknown>): void {
    this.store.reorder({
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
    });
  }
}
```

### Smart component rules

- **`protected readonly` for the store** — accessible in template, immutable reference
- **Logic stays in the store** — the component dispatches, doesn't decide
- **No local UI state in smart components** unless it's truly UI-only (e.g. "drawer is open")
- **No `subscribe` ever** — read signals with `()`
- **No business logic in event handlers** — `(toggle)="store.toggleBought($event)"` is the right shape; if you find yourself transforming the event, it belongs in the store

## Dumb components (ui/)

Pure rendering. Take inputs, emit outputs, manage local UI state. Reusable.

```ts
@Component({
  selector: 'app-grocery-item-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CdkDrag, CdkDragHandle],
  template: `
    @let i = item();
    <li cdkDrag class="row" [class.row--bought]="i.bought">
      <button cdkDragHandle class="handle" aria-label="Reorder">⋮⋮</button>

      <input
        type="checkbox"
        [checked]="i.bought"
        (change)="toggle.emit(i.id)"
      />

      @if (isEditing()) {
        <input
          [value]="i.name"
          (blur)="commitEdit($event, i.id)"
        />
      } @else {
        <span class="name">{{ i.name }}</span>
        <span class="amount">{{ i.amount }}</span>
        <button (click)="isEditing.set(true)" aria-label="Edit">✎</button>
        <button (click)="delete.emit(i.id)" aria-label="Delete">×</button>
      }
    </li>
  `,
})
export class GroceryItemRow {
  readonly item = input.required<GroceryItem>();

  readonly toggle = output<string>();
  readonly edit = output<{ readonly id: string; readonly name: string }>();
  readonly delete = output<string>();

  // Local UI state — purely rendering concern
  protected readonly isEditing = signal(false);

  protected commitEdit(ev: Event, id: string): void {
    const name = (ev.target as HTMLInputElement).value.trim();
    this.isEditing.set(false);
    if (name && name !== this.item().name) {
      this.edit.emit({ id, name });
    }
  }
}
```

### Dumb component rules

- **Never inject the store.** If you need data, declare an `input()`. If you need to communicate up, emit an `output()`.
- **Never inject a service that talks to the API.** Same reason.
- **`OnPush` always.** Belt-and-suspenders even in zoneless mode.
- **`input.required()` over optional inputs** when the contract demands a value
- **`model()` only when it genuinely simplifies** (e.g. a search input). Don't reach for it reflexively over `input()` + `output()`.
- **Local UI state via `signal()`** — `isEditing`, `isMenuOpen`, etc. State that doesn't survive the component going away is fine here.
- **Use `@let`** to alias `item()` once at the top of the template instead of calling the signal repeatedly

## File size

Hard cap: **200 lines per `.ts` file.** If you're approaching that:

- Component class growing? Probably hiding a dumb component inside a smart one — extract.
- Template growing past ~50 lines? Move to a separate `.html` file.
- Lots of computed values? Some belong in the store, not the component.
- Lots of helper methods? Probably pure functions that belong in `<feature>.utils.ts`.

## Signal API quick reference

| Old | New |
|---|---|
| `@Input() name!: string` | `readonly name = input.required<string>()` |
| `@Input() name = ''` | `readonly name = input('')` |
| `@Output() change = new EventEmitter<X>()` | `readonly change = output<X>()` |
| `@ViewChild('x') x!: ElementRef` | `readonly x = viewChild.required<ElementRef>('x')` |
| `[(value)]="v"` | `readonly value = model('')` |

In the template, **always invoke as a function**: `{{ name() }}`, not `{{ name }}`. The compiler will let some uses through silently — don't trust it.

## Anti-patterns

- ❌ `inject()` of a store in a `ui/` component → it's a smart component, move it to `feature/`
- ❌ `effect()` to sync inputs to local state — use `computed` or just read the signal directly
- ❌ `ngOnChanges` lifecycle hook — it's for `@Input` decorators, not `input()` signals; use `computed` or `effect`
- ❌ Wrapping inputs in observables (`toObservable`) just to use RxJS operators — most of the time `computed` does the job
- ❌ `console.log` in a component — use the project's logger or remove it before commit

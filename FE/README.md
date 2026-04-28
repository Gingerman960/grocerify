# Grocerify — Frontend

Production-style proof-of-concept of a grocery list app.

> Read [`CLAUDE.md`](./CLAUDE.md) and [`.claude/README.md`](./.claude/README.md) before contributing — they define the rules and the AI workflow this repo runs on.

---

## Stack

| Concern | Choice |
|---|---|
| Framework | **Angular 21.2+**, standalone, **zoneless** (`provideZonelessChangeDetection`) |
| State | **NgRx SignalStore** with `withEntities`, `rxMethod`, `tapResponse` |
| Forms | **Angular Signal Forms** (`@angular/forms/signals`) — experimental, accepted tradeoff |
| Drag-drop | **Angular CDK** `cdkDropList` + `cdkDragHandle` (handle-only, no whole-row drag) |
| Unit tests | **Vitest** via `@analogjs/vitest-angular`, jsdom |
| E2E tests | **Playwright** (chromium), file-based DB reset between specs |
| Mock API | [`json-server`](https://github.com/typicode/json-server) running in `../BE` on port 3001 |
| Lint / format | ESLint flat config (`angular-eslint`, `typescript-eslint`) + Prettier |

No NgModules. No Material. No Bootstrap. No `subscribe()` in components. No `any`. No file over 200 lines.

---

## Run it

You need **two terminals** — one for the API, one for the dev server.

```bash
# 1. Install (one-time, both packages)
cd BE && npm install
cd ../FE && npm install

# 2. Terminal A — mock API on http://localhost:3001
cd BE && npm start

# 3. Terminal B — Angular app on http://localhost:4200
cd FE && npm start
```

Open <http://localhost:4200>. The app redirects to `/list`.

To reset the seed data, restore `BE/db/db.json` from git.

---

## Project map

```
src/
├── environments/                              Build-time apiBaseUrl swap
│   ├── environment.ts                         Default (dev → http://localhost:3001)
│   └── environment.prod.ts                    Production override
├── testing/                                   Vitest-only setup + factories
└── app/
    ├── app.ts                                 Root component (router-outlet)
    ├── app.config.ts                          Bootstrap providers (zoneless, http+fetch, router)
    ├── app.routes.ts                          '' → 'list'; 'list' loadChildren → grocery-list.routes
    ├── core/config/
    │   └── api-base-url.ts                    InjectionToken<string>, reads environment.apiBaseUrl
    ├── shared/ui/
    │   ├── icon/                              One inline-SVG component, named glyphs
    │   └── progress-bar/                      Reusable; consumes a `Progress` value object
    └── features/grocery-list/
        ├── grocery-list.routes.ts             Lazy bridge that provides the store at the route
        ├── data-access/
        │   ├── grocery-list.types.ts
        │   ├── grocery-list.api.ts            Only thing that touches HttpClient
        │   ├── grocery-list.utils.ts          Pure: fractional ordering, UUID
        │   ├── grocery-list.delete-helpers.ts Soft-delete + undo (extracted to keep store ≤200 lines)
        │   ├── grocery-list.store.ts          SignalStore — provided at the route, NOT root
        │   └── grocery-list.store-harness.ts  TestBed wiring for store specs (excluded from app build)
        ├── ui/                                Dumb components — input()/output() only
        │   ├── add-item-input/                Signal Form, required(name)
        │   ├── column-header/
        │   ├── empty-state/
        │   ├── error-banner/
        │   ├── grocery-item-row/              Plus a sibling -edit component for inline edit
        │   ├── list-header/
        │   ├── list-skeleton/
        │   └── undo-toast/                    Pill with scaleX countdown bar
        └── feature/
            └── grocery-list-page.{ts,html,scss}   Smart container — wires store ↔ ui

e2e/                                           Playwright suite
├── seed.ts                                    Canonical 5-item seed used by every spec
├── fixtures.ts                                resetDb (file-based), dragRow, deleteItem helpers
├── load.spec.ts
├── add.spec.ts
├── drag-reorder.spec.ts
└── delete-undo.spec.ts                        Includes the two-concurrent-deletes race
```

Dependency direction is one-way: `data-access ← feature → ui`. `ui` never imports from `data-access`. No barrel files at the feature level.

---

## State model

The store is a single `signalStore` with `withEntities<GroceryItem>` plus a small ad-hoc state slice:

```ts
type GroceryListState = {
  status: 'idle' | 'loading' | 'fulfilled' | { readonly error: string };
  pendingDeletes: readonly GroceryItem[];   // stack of items awaiting their undo window
  editingId: string | null;                 // which row is in inline-edit mode
};
```

Non-serialisable runtime state (timer handles, in-flight item snapshots) lives in **closure-scoped Maps** inside `grocery-list.delete-helpers.ts`, never in the store. DevTools / SSR transfer-state stay clean.

Derived signals (`withComputed`):
- `sortedItems` — entities sorted by `order`
- `progress` — `{ total, bought, ratio }`, computed in a single pass
- `isLoading`, `error`, `isEmpty`

Mutations (every one is **optimistic + rollback**):
- `loadAll` — `switchMap` GET, `setAllEntities`, status transitions
- `addItem` — generate UUID + next order client-side, `addEntity`, POST, rollback on error
- `toggleBought` — flip locally, PATCH, revert on error
- `editItem` — `updateEntity` with new values, PATCH, restore previous on error
- `requestDelete` / `undoDelete` — see [Undo design](#undo-design) below
- `reorder` — single PATCH on the moved row only, `loadAll` to recover from server failure

---

## Drag-drop & fractional ordering

Each `GroceryItem` carries a numeric `order`. When a row is dropped, we compute the **midpoint** between its new neighbours and PATCH only that row. This yields **one HTTP write per drag** instead of renumbering every affected item.

```
A=1000   B=2000   C=3000   D=4000
move D between A and B:
A=1000   D=1500   B=2000   C=3000   ← single PATCH on D
```

The math lives in `data-access/grocery-list.utils.ts` (`orderBetween`, `nextOrderAfter`, `computeReorder`) and is unit-tested at 100 %.

### POC vs. production: ordering precision

Plain JS `number` runs out of precision after ~50 swaps between the same two neighbours. For a portfolio piece that's fine — the tests document the math. The production upgrade is **lexicographic string keys** ([fractional-indexing](https://github.com/rocicorp/fractional-indexing)): same algorithm, unbounded depth. The only change would be the `order` column type and the helper bodies; the store API and the UI would be unaffected.

---

## <a id="undo-design"></a>Undo design

The design's countdown toast pushed us to **soft delete**. Multiple deletes can be in flight at once, so toasts stack:

1. User clicks the trash icon → store removes the entity from `entities` and **appends** it to `pendingDeletes`. A 5 s `setTimeout` handle goes into a closure-scoped `pendingTimers` Map (not state).
2. **Undo within 5 s** → entity is re-added at its original `order`, timer cleared, item removed from `pendingDeletes`. **No DELETE is ever issued**, so no id has to be regenerated.
3. **Timeout expires** → before the DELETE fires, the item moves out of `pendingDeletes` and into a closure-scoped `inFlightDeletes` Map. The toast disappears immediately, so an in-flight DELETE can no longer race a late undo. On network error the item is restored via `addEntity` and the error is surfaced.
4. Concurrent deletes each get their own timer; `cancelAllPendingTimers()` runs in `onDestroy` so timers don't outlive the route.

Trade-off: a page reload during the 5 s window commits the delete (the timer is in-memory). In production this would be debounced through a server-side soft-delete column instead. It's documented here because a reviewer should know.

---

## Forms

Both the add input and the inline-edit row use **Signal Forms** (`@angular/forms/signals`):

```ts
model = signal<{name: string; amount: string}>({name: '', amount: ''});
form = form(this.model, p => required(p.name, { message: 'Name is required' }));
```

The directive is `[formField]="form.fieldName"` (note: `FormField`, not `Control`). The Save / Add buttons are disabled while the form is invalid. Submit also short-circuits if invalid as a defence in depth.

Signal Forms are still marked experimental in 21.2 — known caveats:
- The `submit()` helper is not used here; `if (!form().valid()) return;` is sufficient and avoids a moving API surface.
- Resetting the form clears values via `model.set(empty)` but does **not** clear the touched/dirty flags. For a single-shot add input this is invisible; for a long-running form we'd revisit.

---

## Testing

```bash
# Unit (vitest, jsdom)
npm test            # vitest run, all suites
npm run test:watch
npm run test:cov    # vitest + v8 coverage

# E2E (Playwright, chromium) — auto-starts BE+FE via webServer
npm run e2e
npm run e2e:ui      # UI mode for debugging
npm run e2e:report  # open the last HTML report

npm run lint
npm run typecheck   # tsc --noEmit
```

### Unit suite

| Layer | Coverage target | Notes |
|---|---|---|
| `data-access/grocery-list.utils.ts`        | 100 % | Every branch of the ordering math |
| `data-access/grocery-list.store.ts`        | ≥ 90 % | Every mutation has the optimistic + rollback path tested. Delete-with-undo uses `vi.useFakeTimers()` and covers the stack-of-toasts API |
| `ui/grocery-item-row/`                     | ≥ 70 % | Renders, struck-through state, every output emission, aria labels |
| `ui/grocery-item-row/(-edit)`              | 100 % | Required validation, trimmed-draft commit, cancel emission, focus on open |
| `ui/add-item-input/`                       | ≥ 70 % | Required validation, trimmed-draft submit, fields clear after submit |
| `ui/undo-toast/`                           | 100 % | Countdown ratio decay, undo emission, scaleX style binding |
| `ui/progress-bar/`                         | ≥ 70 % | Width %, aria-valuenow, empty list behaviour |
| `feature/grocery-list-page.spec`           | smoke | Route resolves, store provides, header+add+empty render |

### E2E suite

| Spec | Covers |
|---|---|
| `load.spec.ts`         | Initial render: 5 seeded rows in `order`, progress label, count |
| `add.spec.ts`          | Submit happy path (persists across reload), Add button disabled when name is empty |
| `drag-reorder.spec.ts` | Drag handle moves a row down one slot; new order persists across reload |
| `delete-undo.spec.ts`  | (a) basic undo restores at original index with no DELETE on the wire; (b) **race spec**: two concurrent deletes, undo the older toast mid-window, the other expires and DELETEs server-side |

DB reset is **file-based** (the fixture writes `BE/db/db.json` directly and waits for json-server to reload). Side effect: e2e runs leave the dev seed overwritten with the e2e seed — restore from git when switching back to manual exploration.

What's intentionally **not** covered:
- The full smart container's branching across all eight design states. Visual regression would catch it more cheaply than DOM assertions;
- Per-row inline-edit interaction in e2e (covered by the row-edit unit spec).

---

## Accessibility

- Semantic `<main>`, `<header>`, `<form>`, `<ul>` / `<li>` everywhere.
- The custom checkbox is a `<button role="checkbox" aria-checked>` with an item-specific `aria-label`.
- The drag handle is a real `<button>` with `aria-label="Reorder item"` and a `cursor: grab` affordance.
- Error banner is an `aria-live="assertive"` alert; undo toast is `aria-live="polite"` status.
- All interactive elements show a sage focus ring (3 px `oklch(0.58 0.045 145 / 0.35)`).
- `prefers-reduced-motion` disables the skeleton shimmer, the progress-bar transition, and the drag rotation.
- Mobile inputs use `font-size: 16px` to suppress iOS Safari's focus-zoom; tappable controls get `touch-action: manipulation` to kill the iOS double-tap-zoom — pinch-to-zoom is preserved.

---

## What's POC vs. what would change for production

| Concern | POC choice | Production move |
|---|---|---|
| Mock API | json-server in `../BE` | Real backend; auth; rate limits |
| Ordering | `number` midpoints | Lexicographic string keys (unbounded precision) |
| Undo timer | In-memory `setTimeout` | Server-side soft-delete column with a TTL |
| Signal Forms | Single-shot inputs | Reusable form primitives, dirty-state-aware reset |
| API errors | Single global error banner | Per-mutation toasts; retry queue |
| Auth | None | Sign-in, per-user lists, sharing |
| Persistence | json-server file | A real DB with row-level security |

---

## Conventions in this repo

- **Files ≤ 200 lines.** If something's growing, split it.
- **No `subscribe()` in components.** Reach for `toSignal`, `rxMethod`, or move it to a store.
- **Optimistic mutations are non-negotiable.** Mutate state, fire the request, rollback on error.
- **`track item.id`** in every `@for` over an entity list.
- **`OnPush` everywhere** — including dumb components, even though zoneless makes it implicit.
- **`input.required<T>()`** when a contract demands a value; never silent defaults.
- **`@Injectable({ providedIn: 'root' })`** for API services; **route-level providers** for feature stores so they dispose on unmount.

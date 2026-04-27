---
name: feature-scaffold
description: How to scaffold a new feature folder in this project. Load this skill when the user asks to "create a feature", "add a new feature", "scaffold X", or when starting work that doesn't fit into an existing feature folder. Also load when adding a new lazy route or when the file you'd create doesn't have an obvious home.
---

# Feature scaffold

Every feature is a self-contained slice with a strict three-folder layout. The dependency direction is one-way: `data-access` ← `feature` → `ui`. Never let `ui` import from `data-access`.

## Layout

```
features/<feature-name>/
├── data-access/
│   ├── <feature>.types.ts         # Domain types — exported, used by api/store/ui
│   ├── <feature>.api.ts           # HTTP service — only thing that touches HttpClient
│   ├── <feature>.store.ts         # SignalStore — see signal-store skill
│   └── <feature>.utils.ts         # Pure helpers (e.g. fractional ordering)
├── ui/
│   ├── <something>-row.ts         # Dumb component — input()/output() only
│   ├── <something>-row.html       # If template > 30 lines, extract
│   └── <something>-row.scss       # Component-scoped styles
└── feature/
    └── <feature>-page.ts          # Smart container — injects store, wires ui
```

## Build order

1. **Types** (`data-access/<feature>.types.ts`)
   - Define the domain model and any DTOs
   - Use `type` over `interface` unless declaration merging is needed
   - Mark fields `readonly` where appropriate
   - No `I` prefix on type names (`GroceryItem`, not `IGroceryItem`)

2. **API** (`data-access/<feature>.api.ts`)
   - Plain `@Injectable({ providedIn: 'root' })` service (api services *can* be root-provided; stores can't)
   - Methods return `Observable<T>` — the store consumes them via `rxMethod`
   - Use the project's base API path token from `core/config/`
   - One method per HTTP operation: `getAll()`, `getById(id)`, `create(draft)`, `patch(id, changes)`, `delete(id)`

3. **Utils** (`data-access/<feature>.utils.ts`)
   - Pure functions only — no state, no injection
   - Easiest to test, write tests as you write the function

4. **Store** (`data-access/<feature>.store.ts`)
   - Load the `signal-store` skill for the canonical template
   - State minimal, computed for derived, methods for mutations

5. **Dumb components** (`ui/`)
   - Load the `component-patterns` skill if uncertain about smart vs dumb
   - Take signal inputs, emit signal outputs, render only

6. **Smart container** (`feature/`)
   - Inject the store, render dumb components, wire handlers
   - Thin — most logic lives in the store

7. **Lazy route** in `app.routes.ts`:
   ```ts
   {
     path: 'grocery-list',
     providers: [GroceryListStore],
     loadComponent: () =>
       import('./features/grocery-list/feature/grocery-list-page')
         .then(m => m.GroceryListPage),
   }
   ```

## Naming

- Components: `PascalCase` class, `kebab-case` filename, `app-` selector prefix
- Stores: `<Feature>Store` (e.g. `GroceryListStore`)
- API services: `<Feature>Api` (e.g. `GroceryListApi`) — note: NOT `Service` suffix, the file is `*.api.ts`
- Types: `PascalCase`, no `I` prefix

## What you'd reach for that's wrong here

- ❌ Barrel `index.ts` at the feature root — defeats tree-shaking, banned
- ❌ Putting components directly under `features/<feature>/components/` (Bootstrap/Material convention) — we use the `ui/` and `feature/` split
- ❌ A `services/` folder — API service goes in `data-access/` next to the store and types it serves
- ❌ Sharing types via `shared/types/` — types live with their feature unless genuinely cross-feature

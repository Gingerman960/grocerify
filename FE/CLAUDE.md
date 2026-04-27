# CLAUDE.md — Grocery List App

Source of truth for code generation in this repo. Read on every session.

## Mission

Production-grade proof-of-concept for a grocery list app. The persona behind the code is a senior Angular engineer reviewing a PR — anything cargo-culted, AI-flavored, or dead gets rejected. POC framing does **not** lower the bar; it focuses scope.

## Stack (non-negotiable)

- **Angular 21.2+** with zoneless change detection (`provideZonelessChangeDetection()`)
- **TypeScript** with `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`
- **NgRx SignalStore** (`@ngrx/signals`, `/entities`, `/rxjs-interop`) for state
- **Angular Signal Forms** (`@angular/forms/signals`) — experimental, accepted tradeoff
- **Angular CDK** drag-drop and scrolling — no Material, no Bootstrap
- **Vitest** for tests
- **JSON Server** for the mock backend

## Project map

```
src/app/
├── app.config.ts              # provideRouter, provideZonelessChangeDetection, provideHttpClient(withFetch())
├── app.routes.ts              # all routes lazy
├── core/                      # cross-cutting singletons (interceptors, config tokens)
├── shared/                    # feature-agnostic ui/, util/, directives/
└── features/grocery-list/
    ├── data-access/           # store, api, types, utils
    ├── ui/                    # dumb components — no store injection
    └── feature/               # smart containers — wire store ↔ ui
```

**Dependency direction is one-way.** `data-access` ← `feature` → `ui`. `ui` never imports from `data-access`. `shared` never imports from `features`.

## Hard rules (refuse to violate)

1. No `NgModule`. Standalone everywhere. Bootstrap with `bootstrapApplication`.
2. No constructor injection. Use `inject()`.
3. No `@Input()` / `@Output()` decorators. Use `input()`, `input.required()`, `output()`, `model()`.
4. No `*ngIf` / `*ngFor` / `*ngSwitch`. Use `@if`, `@for` (with `track`), `@switch`, `@let`, `@defer`.
5. No `subscribe()` in components. Use `toSignal`, async pipe, or `rxMethod` in a store. If unavoidable, `takeUntilDestroyed(destroyRef)`.
6. No `any`. Use `unknown` and narrow, or model the type.
7. No `effect()` for state mutation. State changes go through store methods. `effect()` is for outside-the-app side effects only.
8. No raw `HttpClient` calls in components. Always via a feature `data-access` service consumed by the store.
9. No barrel files (`index.ts`) at the feature level.
10. No `providedIn: 'root'` for feature-scoped stores. Provide at the route level so they dispose on unmount.
11. No `setTimeout` to "make change detection work" — that's always a real bug.
12. **File size cap: 200 lines per `.ts` file.** Split before you hit it.

## How to build something new

For any non-trivial work, follow the skill that matches the task:

- Building or modifying a SignalStore → load `.claude/skills/signal-store/SKILL.md`
- Scaffolding a new feature folder → load `.claude/skills/feature-scaffold/SKILL.md`
- Drag-and-drop reordering work → load `.claude/skills/drag-drop-reorder/SKILL.md`
- Smart vs dumb component decisions → load `.claude/skills/component-patterns/SKILL.md`
- Writing tests → load `.claude/skills/testing-patterns/SKILL.md`

Skills contain the templates and worked examples. CLAUDE.md is the law; skills are the recipes.

## Workflow expectations

- **Plan before coding** for any change touching more than one file. Output the plan, get approval, then execute.
- **Reference files explicitly** in prompts (`@src/app/features/...`) instead of vague descriptions.
- **Run `ng lint && npx tsc --noEmit` before declaring work done.** A hook enforces lint on save; type-check is on you to invoke.
- **Optimistic updates with rollback** is the default pattern for any mutation. Mutate state, fire the request, rollback on error.
- **Atomic commits, conventional format**: `feat(grocery-list): add fractional reorder`. One concern per commit.

## Anti-patterns to refuse

- `any` to silence a type error → fix the type
- `subscribe()` in `ngOnInit` → use `toSignal` or move to store
- Business logic in templates → move to `computed` or store method
- Adding a library for something native APIs handle (e.g. `uuid` — use `crypto.randomUUID()`)
- Catching errors silently → surface via store error state
- Tests written after the fact "for coverage" → tests describe intent, write them as you build
- Generic "utils" dumping ground → put utilities next to their consumer or in `shared/util/<concern>/`

## When in doubt

Boring over clever. Explicit over magic. Pure functions over stateful classes. Refusal over silent compromise — surface the conflict and propose alternatives.

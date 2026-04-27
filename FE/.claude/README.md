# `.claude/` — Claude Code configuration

This folder configures Claude Code for this repo. Three layers, each with a distinct purpose:

## Layer 1 — `CLAUDE.md` (root, ~80 lines)

Loaded automatically into every conversation. Contains only:
- Mission and stack
- Project map
- Hard rules that apply on every turn
- Pointers to skills

**Why kept lean:** Anthropic guidance and field reports converge on the same finding — once a CLAUDE.md crosses ~150 lines, instruction-following degrades across the board, including the rules you care about. Detailed templates and worked examples don't belong here.

## Layer 2 — `.claude/skills/<name>/SKILL.md` (loaded on demand)

Domain knowledge that's only relevant for specific tasks. Each skill has YAML frontmatter (`name`, `description`) so Claude knows when to load it. Templates and worked examples live here, not in CLAUDE.md.

| Skill | Loaded when |
|---|---|
| `signal-store` | Building or modifying any `*.store.ts` |
| `feature-scaffold` | Creating a new feature folder or lazy route |
| `drag-drop-reorder` | Implementing drag/drop, fractional ordering |
| `component-patterns` | Creating any component, smart vs dumb decisions |
| `testing-patterns` | Writing or modifying any `*.spec.ts` |

## Layer 3 — `.claude/settings.json` (deterministic enforcement)

Permissions and hooks. Unlike CLAUDE.md (advisory prose), this is enforced by Claude Code itself.

- **`allow` / `deny` permissions** — Claude can't accidentally `npm install`, `git push`, read `.env`, or `rm -rf` anything
- **`PostToolUse` hooks** — auto-lint TypeScript on save, auto-format HTML
- **`PreToolUse` hooks** — block writes to forbidden paths (barrel files, generated files)
- **`Stop` hook** — type-check at end of session

## `CLAUDE.local.md` (gitignored)

Personal preferences that shouldn't apply to the team. Add `.claude/CLAUDE.local.md` to `.gitignore`.

## How to work with this setup

When asking Claude to do something non-trivial:

1. **Reference files explicitly** — `@src/app/features/grocery-list/data-access/grocery-list.store.ts` instead of "the store". Cheaper, more accurate.
2. **Use plan mode for multi-file changes** — review the plan, then execute.
3. **Run `/compact` around 50% context, `/clear` between unrelated tasks.**
4. **The skills load automatically based on the task.** You don't need to invoke them, but you can mention "follow the signal-store skill" if Claude misses it.

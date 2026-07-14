## What this is

Ledgermain is a web-based **in-play character sheet, tracker, and builder for Pathfinder 1e**. The product's center of gravity is _play at the table_ — a rules-aware tracker that recomputes correct numbers as live session state (HP, conditions, buffs, resources) changes, not just a builder. Read `docs/design.md` for architecture rationale — the source of truth for _why_ things are shaped the way they are; `README.md` covers what the project is and how to run it.

## Commands

Toolchain is **bun** with workspaces. Tests run on **`bun test`** — **except** `apps/api`, whose Worker routes need a real Workers runtime to test against (`@cloudflare/vitest-pool-workers`); its `test` script shells out to `vitest run`, and `bun run test` (root) picks it up automatically via the existing `--filter '*'` mechanism, no special-casing needed.

```bash
bun install
bun run dev          # @pf1/web on http://localhost:5173 (predev copies RefData into public/data/)
bun run build        # build all packages
bun run typecheck    # tsc --noEmit across all packages — the primary gate
bun run lint         # oxlint across the workspace (must stay green; warnings tolerated)
bun run lint:fix     # oxlint --fix (auto-fixes safe rules)
bun run fmt          # oxfmt across the workspace
bun run fmt:check    # oxfmt --check (CI-shaped gate)
bun run test         # all unit tests (engine + data-pipeline + web)
bun run e2e          # Playwright (Chromium); boots its own dev server
```

Run one package's tests / a single test:

```bash
bun test packages/engine                       # one package
bun --filter @pf1/engine test                  # via workspace filter
bun test packages/engine/test/stacking.test.ts # one file
bun test -t "two morale bonuses don't stack"   # by test name
```

Reference data (only when bumping the pinned Foundry content):

```bash
bun run data:fetch   # shallow-clone the pinned SHA into packages/data-pipeline/.cache/ (gitignored)
bun run data:build   # regenerate normalized JSON into packages/data-pipeline/data/ (committed)
```

To update data: edit `FOUNDRY_SHA` / `SYSTEM_VERSION` in `packages/data-pipeline/src/config.ts`, run the two commands, **then run `bun run fmt`**, review the diff, commit. The app builds offline from the vendored JSON; never make data updates implicit.

> **`bun run fmt` is a required post-`data:build` step, not optional cleanup.** The emitter writes JSON with every array expanded one-element-per-line, but the committed `data/*.json` is oxfmt-formatted (short arrays collapsed onto one line). Skip the fmt and `git status` shows thousands of lines changed across _every_ data file (all whitespace) even when only one value actually changed — and `fmt:check` fails in CI. After fmt, the diff collapses to just the real content change. The same applies to hand-authored data supplements (e.g. `data-pipeline/src/supplements.ts`): edit the supplement → `data:build` → `fmt`.

## Architecture

Five bun-workspace packages, one data-flow rule.

```text
packages/schema         shared types: CharacterDoc, DerivedSheet, RefData (the contracts everything imports)
packages/data-pipeline  pinned Foundry YAML → normalized JSON (vendored under data/, committed)
packages/engine         pure rules engine — compute(doc, refData) -> DerivedSheet (the crown jewel)
apps/web                React + Vite builder + live tracker
apps/api                Cloudflare Worker: dumb persistence for CharacterDoc blobs (Stage 5, docs/design.md.md §2.1)
```

### The one rule that governs everything

> **The client is authoritative for all game logic. The server is dumb persistence.**

Derived stats are **never** computed or stored server-side — the server only stores an opaque JSON `CharacterDoc` blob. The corner to never cut: nothing that toggles a buff, applies damage, or computes a modifier may require a server round-trip.

### Two objects, one engine

- **`CharacterDoc`** (schema) — the single source of truth. Holds _build choices_ (`build.*`) and _live session state_ (`live.*`: hp, conditions, activeBuffs, resources) but **never derived values**. Carries `ownerId`/`version`/`updatedAt` already, for Stage 5 optimistic-concurrency sync.
- **`compute(doc, refData) -> DerivedSheet`** (engine) — pure, framework-agnostic, returns every displayed number. Toggle anything in the doc → recompute. It's cheap; the web app recomputes on every change rather than memoizing cleverly.

The engine has two genuinely hard pieces, both clean-room (see licensing below):

1. **Typed bonus-stacking** (`stacking.ts`) — highest-within-type; `dodge`/`untyped`/`circumstance` sum; penalties always stack. Retains per-source provenance (`applied` flag) so the UI can strike through overridden bonuses.
2. **Formula DSL evaluator** (`formula.ts`) — recursive-descent parser + tree-walker (no `eval`) for the Foundry roll-formula dialect: `@data.paths`, functions (`if`, `gte`, `min`, `max`, …), and dice terms. Missing paths resolve to `0` (Foundry behavior). Dice terms parse but throw on numeric eval; use `tryEvaluateFormula` (returns `null`) so damage formulas never crash the static sheet. BAB/save numeric tables are hardcoded in `tables.ts` (the YAML only carries `high|med|low` tiers).

### Web app structure (the important split)

All builder/tracker **logic is pure and in `apps/web/src/model/`** (`doc.ts` doc transitions, `prereqs.ts`, `skills.ts`, `hp.ts`, `buffs.ts`, etc.) — tested directly with no DOM. React components in `components/` are thin views. `state/useCharacter.ts` is the **only** binding layer: model transition → `compute()` → Dexie. When adding a feature, put the logic in a `model/` module with tests, then wire a thin component.

- **RefData in the browser**: `data-pipeline`'s `loadRefData()` is Node-fs based; the app instead uses `src/refdata/loader.ts` (fetch). `scripts/copy-refdata.ts` copies vendored JSON into `public/data/` at predev/prebuild (gitignored — source of truth stays in the package). `refdata/loader.ts` is the _only_ place that knows where data lives, so Stage 5 can swap in lazy R2 loading there.
- **Persistence**: IndexedDB via Dexie (`src/db/characters.ts`, database `pf1-tracker`) is the source of truth; one active character; autosaves and restores most-recently-edited on load. `src/sync/` (Stage 5) layers optional background push/pull to `apps/api` on top — pure decision logic in `sync/planSync.ts`, a thin `fetch` wrapper in `sync/client.ts`, orchestration in `sync/backgroundSync.ts`, all wired into `state/useCharacter.ts`. Degrades to a complete no-op when `VITE_API_URL` is unset.
- **Vite/workspace-TS gotcha**: `@pf1/engine` and `@pf1/schema` publish raw `.ts` (no build step). `apps/web/vite.config.ts` aliases the bare specifiers to their `src/index.ts`; Vite's resolver handles their internal `./foo.js` → `./foo.ts` fallback. Keep these aliases in sync if package entry points move.

## Licensing — clean-room discipline (important)

The engine is a **clean-room reimplementation** from the published PF1 rules. The codebase is licensed **`AGPL-3.0-or-later`** (see `NOTICE.md` §1 / `docs/design.md.md` §6 for why AGPL over a permissive license: provenance honesty + network-copyleft; it's compatible with Foundry's GPL-3.0). Foundry's GPL-3.0 system code (`apply-changes.mjs`, `formulas.mjs`, etc.) may be used **only as a behavioral test oracle — never copied, transcribed, or ported**. When validating engine behavior, compare _outputs_ (given input X, both produce Y), not code structure. Compendium _data_ is used under OGL / Paizo Community Use with attribution intact. Do not paste upstream source into this repo.

## Conventions

- TypeScript strict everywhere. `bun run typecheck` is the gate that must stay green.
- Lint must stay green: `bun run lint` (errors block; warnings tolerated). Run `bun run lint:fix` first to auto-fix. Don't add new lint warnings to existing code paths.
- Run `bun run fmt` before committing; `bun run fmt:check` must be green. Don't commit hand-formatted code that fights oxfmt — if you disagree with a fmt result, change your code, don't fight the tool.
- **Comments explain the unexpected, and are brief. Keep ephemeral context out of code and committed docs.** No pointers to dated audits, planning docs, "wave N", "as-built section", "round-2 notes", or "issue #NN's X pass" — that provenance belongs in the commit message, not the source. A comment should say _why_ the code is surprising and stand on its own, without an external working-doc to resolve it. (A bare issue reference for still-open tracked work is fine; a pointer into a narrative build log is not.)
- When touching the engine, add hand-computed fixture tests (the pattern in `packages/engine/test/`); the engine tests run against the real vendored data slice via `loadRefData()`.
- Feat prereqs are **hybrid**: hard-block only on _structured_ signals (ability min, BAB, caster level, required `@UUID` feats); prose-only prereqs (`prereqText`) show a soft warning and never block. Don't promise perfect prereq enforcement.
- Always check for the dev server listening before killing and starting it.

## Git

This is a personal project: **commit directly to `main` by default** — no feature branch or PR needed unless explicitly asked. **Commit working changes by default** once they typecheck (don't leave the tree dirty waiting to be asked). This applies to subagents too. Do not add `Co-Authored-By` trailers.

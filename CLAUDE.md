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
bun run screenshots  # regenerate docs/images/{tracker,builder}.png from the sample character
```

Bumping the pinned Foundry reference data has its own procedure with a formatting trap that produces a thousands-of-lines-changed diff if skipped — see `docs/refdata-update.md` (the `refdata-update` skill points there); after hand-editing the pins, `bun run data:bump` runs the fetch/build/format steps in the trap-proof order.

**Deployment is automatic, not a command you run.** Both `apps/web` and `apps/api` deploy via Cloudflare Workers Builds — a git-connected build configured in the Cloudflare dashboard (not visible in this repo) that deploys on every push to `main`. `.github/workflows/ci.yml` only runs typecheck/lint/fmt/tests; it has no deploy step. Never run `wrangler deploy` (or suggest the user run it) to ship a change — committing and pushing to `main` is the deploy.

## Architecture

Five bun-workspace packages, one data-flow rule.

```text
packages/schema         shared types: CharacterDoc, DerivedSheet, RefData (the contracts everything imports)
packages/data-pipeline  pinned Foundry YAML → normalized JSON (vendored under data/, committed)
packages/engine         pure rules engine — compute(doc, refData) -> DerivedSheet (the crown jewel)
apps/web                React + Vite builder + live tracker
apps/api                Cloudflare Worker: dumb persistence for CharacterDoc blobs (Stage 5, docs/design.md §2.1)
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

### Web app structure

`apps/web/CLAUDE.md` covers the pure-logic-in-`model/` split, RefData loading, Dexie persistence, and the Vite alias gotcha.

## Licensing — clean-room discipline (important)

The engine is a **clean-room reimplementation** from the published PF1 rules. The codebase is licensed **`AGPL-3.0-or-later`** (see `NOTICE.md` §1 / `docs/design.md` §6 for why AGPL over a permissive license: provenance honesty + network-copyleft; it's compatible with Foundry's GPL-3.0). Foundry's GPL-3.0 system code (`apply-changes.mjs`, `formulas.mjs`, etc.) may be used **only as a behavioral test oracle — never copied, transcribed, or ported**. When validating engine behavior, compare _outputs_ (given input X, both produce Y), not code structure. Compendium _data_ is used under OGL / Paizo Community Use with attribution intact. Do not paste upstream source into this repo.

## Conventions

- TypeScript strict everywhere. `bun run typecheck` is the gate that must stay green.
- Lint must stay green: `bun run lint` (errors block; warnings tolerated). Run `bun run lint:fix` first to auto-fix. Don't add new lint warnings to existing code paths.
- Run `bun run fmt` before committing; `bun run fmt:check` must be green. Don't commit hand-formatted code that fights oxfmt — if you disagree with a fmt result, change your code, don't fight the tool.
- **Comments explain the unexpected, and are brief. Keep ephemeral context out of code and committed docs.** No pointers to dated audits, planning docs, "wave N", "as-built section", "round-2 notes", or "issue #NN's X pass" — that provenance belongs in the commit message, not the source. A comment should say _why_ the code is surprising and stand on its own, without an external working-doc to resolve it. (A bare issue reference for still-open tracked work is fine; a pointer into a narrative build log is not.)
- **Content gaps have one source of truth: `apps/web/src/model/coverageNotes.ts`** (rendered as the "What's Not Covered" panel in Settings; purely internal gaps go in its `INTERNAL_GAPS` array, which the panel never shows). Filling a gap means deleting its entry; finding one means adding it. Keep #74 a plain inventory of what's _missing_ — no phase/status narrative, and cite it as a bare `#74`.
- **`coverageNotes.ts` only ever shrinks.** Its one recurring failure is growing as gaps close, because rewriting an entry to narrate what now works is easier than deleting it. Closing a gap means removing the entry or cutting it back to the smaller gap that remains — never appending what shipped. No "used to", "no longer", "now also", no counts of what got fixed, no enumerating the races or lists that _do_ work; that all belongs in `changelog.ts`, which is the counterpart this file must not converge with. `issueDetail` carries inventory facts (how many entries exist, how many are modeled, what blocks the rest), not implementation history: no issue numbers, no commit provenance, no "audited in the sweep". `apps/web/test/coverageNotes.test.ts` enforces the word budgets and banned constructions — if an edit trips it, cut the entry, don't raise the budget.
- **No em or en dashes in player-facing copy.** House style (the voice guide in the user's vault) bans them outright. In `changelog.ts` and `coverageNotes.ts` the fix is to restructure the sentence with a colon, a period, or a pair of commas — never print the `--` markdown substitute on screen. Enforced by `apps/web/test/houseStyle.ts` from both tests. Code comments and commit messages are out of scope.
- **Touching `coverageNotes.ts` obligates you to sync issue #74, in the same change.** #74 is a generated mirror of that file, so _any_ edit to it — filling a gap, adding one, or only rewording a sentence — leaves the issue stale. Run `bun run coverage:issue --write`. **This is the standing exception to "don't edit issues without user confirmation" below**: #74 is generated output, not correspondence, so pushing it needs no confirmation and skipping it is the actual mistake. Never hand-edit the issue body.
- **When a change alters what a player sees or can do, add a `apps/web/src/model/changelog.ts` entry** — dated `YYYY-MM-DD-slug`, newest first, written in play language with no issue numbers. It's the "What's New" panel in Settings, and the Settings tab's dot keys off the top entry's id, so never rewrite a shipped id. It's explicitly _notable changes only_, not a release log: refactors, data regens, and internal fixes don't earn a line, which is what keeps a missing entry quiet rather than wrong.
- When touching the engine, add hand-computed fixture tests (the pattern in `packages/engine/test/`); the engine tests run against the real vendored data slice via `loadRefData()`, and new fixtures cite the rulebook source for expected values. `docs/engine-cookbook.md` documents the compute pipeline and the recipe for each common kind of engine change — keep it truthful when changing pipeline structure.
- Feat prereqs are **hybrid**: hard-block only on _structured_ signals (ability min, BAB, caster level, required `@UUID` feats); prose-only prereqs (`prereqText`) show a soft warning and never block. Don't promise perfect prereq enforcement.
- Always check for the dev server listening before killing and starting it.

## Git

- This is a personal project: **commit directly to `main` by default** — no feature branch or PR needed unless explicitly asked. **Commit working changes by default** once they typecheck (don't leave the tree dirty waiting to be asked). This applies to subagents too. Do not add `Co-Authored-By` trailers.
- Issues are tracked and viewable on GitHub via the `gh` CLI tool.
- Do not respond directly to issues or PRs without user confirmation. **One exception: issue #74's body**, which is generated from `coverageNotes.ts` and must be re-synced with `bun run coverage:issue --write` whenever that file changes — no confirmation needed, and not optional. See the coverage-gaps convention above.

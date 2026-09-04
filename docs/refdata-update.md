# Updating reference data

`packages/data-pipeline/data/` is the vendored, normalized JSON that ships with the app -- every class, feat, spell, race, buff, and the rest of the PF1 compendium content. It's generated, not hand-authored, and it's committed to the repo so the app builds and runs fully offline. This doc covers how to bump it to a newer upstream commit.

## What's pinned, and where

The pipeline reads from four upstream repos, each pinned to an **exact commit** (never a branch) in `packages/data-pipeline/src/config.ts`, so the normalized output is fully reproducible and never silently drifts:

| Constant                         | Source                                | What it supplies                                                                                                                                                                                                                                                                |
| -------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FOUNDRY_SHA` / `SYSTEM_VERSION` | Foundry VTT's `pf1` system repo       | Core classes, feats, spells, races, buffs, items -- the bulk of the data                                                                                                                                                                                                        |
| `ARCHETYPE_SHA`                  | `Tryss_Farron/pf1e-archetypes`        | Archetypes, archetype features, prestige classes/features                                                                                                                                                                                                                       |
| `PF_CONTENT_SHA`                 | `foundryvtt_pathfinder1e/pf1-content` | The larger community feats/traits/racial-traits packs                                                                                                                                                                                                                           |
| `PFDATA_SHA`                     | `jasontankapps/pathfinder-data-1-e`   | Prose-only subsystem catalogs (rage powers, hexes, talents, etc.) merged at read time, plus the monster/monster-template sidecar collections (statblocks parsed by `util/monsterStatblock.ts`; numeric fidelity checked with `bun scripts/monster-oracle-diff.ts` after a bump) |

A hand-authored supplement (`packages/data-pipeline/src/supplements.ts`) fills a handful of gaps none of the four sources carry (e.g. the Aberrant bloodline's bonus-spell list) -- same trap applies when editing it (see below).

## When to bump it

Only when you deliberately want newer upstream content -- a new Foundry PF1 release, a new archetype landing in the archetype module, etc. The app is never allowed to depend on a network fetch at runtime, and a data bump is a reviewable, committed change like any other.

Nothing auto-_applies_ a bump, but you no longer have to remember to look for one. Renovate watches all four pins (`renovate.json`, four `custom.regex` managers against the constants in `config.ts`) and opens a PR when any of their default branches moves. Before that, CI's refusal to touch the network meant nothing ever said "you are behind": the Foundry pin sat 265 commits stale for two months without a prompt.

## The automated path

A Renovate pin PR arrives half-done, because Renovate can move a pin but cannot regenerate the data behind it (`postUpgradeTasks` is self-hosted-only, and this repo uses the hosted app). Two things close that gap:

- **`.github/workflows/refdata-sync.yml`** runs `bun run data:bump` plus `sample:build` on the branch and pushes the result back as a second commit. That commit is the one worth reviewing; the pin change itself carries no information beyond which SHA. It needs a `REFDATA_SYNC_TOKEN` repo secret (a PAT with `contents: write`) -- `GITHUB_TOKEN` cannot be used, because pushes made with it never trigger a workflow run, so the regenerated commit would never be checked and Renovate would wait forever on checks that cannot arrive.
- **`packages/data-pipeline/test/pinIntegrity.test.ts`** asserts that all four SHAs recorded in `meta.sourcePins` equal the constants in `config.ts`. If the sync workflow fails, is skipped, or gets removed, this is what makes the PR red instead of quietly mergeable. A pin without its regeneration can never land green.

So the review is the same as ever -- read the regenerated diff, decide -- but the mechanical half happens without you, and the "nothing ever says you are behind" gap is closed.

Everything below still applies verbatim to a bump you drive by hand, and driving one by hand stays perfectly normal.

## Procedure

1. **Hand-edit the pin(s).** In `packages/data-pipeline/src/config.ts`, change whichever `*_SHA` (and `SYSTEM_VERSION`, if bumping Foundry) you're updating. This step is inherently a judgment call -- which commit to pin, what changed upstream -- so it's not scripted.
2. **Run the mechanical steps.** From the repo root:

   ```bash
   bun run data:bump
   ```

   This runs, in order:

   ```bash
   bun run data:fetch   # shallow-clone the pinned SHA(s) into packages/data-pipeline/.cache/ (gitignored)
   bun run data:build   # regenerate normalized JSON into packages/data-pipeline/data/ (committed)
   bun run fmt          # required -- see "the formatting trap" below
   ```

   `data:fetch` re-fetches all four sources but is a no-op for any repo already at its pinned SHA -- cheap to re-run.

3. **Review the diff**, then commit `packages/data-pipeline/data/` together with the `config.ts` (or `supplements.ts`) edit that caused it.

Editing `supplements.ts` (rather than a pin) follows the same shape: edit the supplement → `bun run data:build` → `bun run fmt` → review → commit. `data:fetch` isn't needed since nothing upstream changed.

## The formatting trap, and why `data:bump` exists

The pipeline's JSON emitter writes every array expanded one element per line. The **committed** `data/*.json` is oxfmt-formatted, which collapses short arrays onto one line. If you run `data:fetch && data:build` and stop there, `git status` shows **thousands of lines changed across every data file** -- all whitespace -- even when only one value actually changed upstream. Worse, `bun run fmt:check` (the CI gate) fails on the unformatted output.

Running `bun run fmt` immediately after `data:build` collapses the diff back down to just the real content change. `data:bump` runs fetch → build → fmt in one command specifically so this step can't be skipped by accident. If you ever do run the raw `data:fetch`/`data:build` commands by hand instead of `data:bump`, don't forget the `fmt` step.

## When a bump makes a supplement redundant

`supplements.ts` hand-authors content the four sources omit or state wrongly. Every entry there is a bet that upstream still lacks it, and a bump can win that bet back -- the pack starts documenting a domain power, fixes a `maxFormula`, resolves an archetype feature's level.

A supplement that keeps shadowing correct upstream data is worse than no supplement: it silently pins that value to whatever was true the day the entry was written, and nothing downstream can tell. So every `apply*` function throws when its target is already satisfied upstream, and `data:build` is where that fires:

```
error: [supplements] domain "artifice" power "Dancing Weapons" is now covered upstream -- retire the supplement entry
```

That is the system working, not a broken bump. Delete the named entry, rerun `bun run data:bump`, and repeat until the build is clean -- there may be several. Each deletion is part of the same commit as the pin.

The guards pointed the other way (target not found, renamed, or its description no longer saying what the entry was authored against) fire the same way and mean the opposite: the supplement is now aimed at something that moved, so re-verify it against the published rule before re-authoring.

## Verifying the result

- **Expected diff shape**: a real bump's diff should be readable -- new/changed/removed entries in the JSON files that trace back to what actually changed upstream, not a wall of reformatted arrays. If `git diff --stat` shows every file in `packages/data-pipeline/data/` with a huge line count, you skipped `fmt` (or force-pushed over `data:bump` with the raw commands).
- **Tests**: run the data-pipeline's own invariant tests, then the engine tests (which load the real vendored slice via `loadRefData()`), then the full suite if the diff touches a lot of surface:

  ```bash
  bun run --filter @pf1/data-pipeline test
  bun run --filter @pf1/engine test
  bun run test          # full suite, if the diff is broad
  bun run typecheck
  bun run fmt:check
  ```

- If a schema-shape change came along with the bump (a new collection, a widened type), bump `SCHEMA_VERSION` in `config.ts` too and document what changed in the comment above it -- see the existing v1-v16 history there for the expected level of detail.
- Re-run `bun run sample:build` (`apps/web`) if the bump might have renamed or dropped anything the shipped sample character references -- it throws instead of silently emitting a broken doc.

## What `bun run data:bump` does _not_ do

It doesn't choose or edit the pin -- that's the deliberate, judgment-call part of the procedure (step 1 above) and stays a manual edit to `config.ts` (or `supplements.ts`). It only automates the mechanical fetch → build → fmt sequence that follows.

---
name: refdata-update
description: Bump the pinned Foundry reference data — regenerate the vendored JSON under packages/data-pipeline/data/. Use when changing FOUNDRY_SHA or SYSTEM_VERSION, running data:fetch or data:build, or editing a hand-authored data supplement.
---

# Updating reference data

Only needed when bumping one of the pinned upstream sources (Foundry `pf1` system, the archetype module, PF1 Content, or Pf Data 1e). The app builds offline from the vendored JSON; never make data updates implicit.

**Full procedure, the formatting trap, and verification steps: `docs/refdata-update.md`.** Read that doc before doing this — don't reconstruct the steps from memory or from this file.

Quick reference once you've read the doc:

1. Hand-edit the relevant `*_SHA` (and `SYSTEM_VERSION` if bumping Foundry) in `packages/data-pipeline/src/config.ts` — the one judgment-call step.
2. Run `bun run data:bump` (`scripts/refdata-bump.ts`) — runs `data:fetch` → `data:build` → `fmt` in order, so the formatting trap documented in `docs/refdata-update.md` can't be hit by skipping a step.
3. Review the diff and commit per the doc's verification section.

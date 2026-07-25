---
name: refdata-update
description: Bump the pinned Foundry reference data — regenerate the vendored JSON under packages/data-pipeline/data/. Use when changing FOUNDRY_SHA or SYSTEM_VERSION, running data:fetch or data:build, or editing a hand-authored data supplement.
---

# Updating reference data

Only needed when bumping the pinned Foundry content. The app builds offline from the vendored JSON; never make data updates implicit.

```bash
bun run data:fetch   # shallow-clone the pinned SHA into packages/data-pipeline/.cache/ (gitignored)
bun run data:build   # regenerate normalized JSON into packages/data-pipeline/data/ (committed)
```

To update data: edit `FOUNDRY_SHA` / `SYSTEM_VERSION` in `packages/data-pipeline/src/config.ts`, run the two commands, **then run `bun run fmt`**, review the diff, commit.

> **`bun run fmt` is a required post-`data:build` step, not optional cleanup.** The emitter writes JSON with every array expanded one-element-per-line, but the committed `data/*.json` is oxfmt-formatted (short arrays collapsed onto one line). Skip the fmt and `git status` shows thousands of lines changed across _every_ data file (all whitespace) even when only one value actually changed — and `fmt:check` fails in CI. After fmt, the diff collapses to just the real content change. The same applies to hand-authored data supplements (e.g. `data-pipeline/src/supplements.ts`): edit the supplement → `data:build` → `fmt`.

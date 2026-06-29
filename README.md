# Pathfinder 1e In-Play Tracker

A web-based **in-play character sheet, tracker, and builder** for Pathfinder 1e. The center of gravity is *play at the table*: a rules-aware tracker that recomputes correct numbers as session state (HP, conditions, buffs, resources) changes. Built to run on Cloudflare.

See [`DESIGN.md`](./DESIGN.md) for architecture and [`IMPLEMENTATION_PLAN.md`](./IMPLEMENTATION_PLAN.md) for the staged plan + per-stage caveats.

## Status — 4 of 5 stages complete

| Stage | What | State |
|---|---|---|
| 1 | Data pipeline + schema (Foundry YAML → normalized JSON, pinned & vendored) | ✅ Complete |
| 2 | Rules engine (formula DSL, typed bonus-stacking, `compute()`) | ✅ Complete |
| 3 | Builder MVP (React/Vite, live sheet, IndexedDB) | ✅ Complete |
| 4 | **In-play tracker** (HP, conditions, buffs w/ round durations, resources) | ✅ Complete |
| 5 | Persistence + Level-1 cross-device sync (Cloudflare Worker, identity, optimistic concurrency) | ⏳ Not started |

**Verified:** `typecheck` clean across all packages · 90 unit tests · 3 Playwright e2e (incl. condition-toggle-revert and buff-apply-then-expire).

## Layout (bun workspaces)

```
packages/schema         shared types: CharacterDoc, DerivedSheet, RefData
packages/data-pipeline  pinned Foundry fetch → normalized JSON (vendored in data/)
packages/engine         pure rules engine (clean-room; the crown jewel)
apps/web                React + Vite builder + tracker ("illuminated ledger" UI)
```

## Run it

```bash
bun install
bun run dev          # → http://localhost:5173  (copies RefData, then starts Vite)
```

## Test

```bash
bun run typecheck    # all packages
bun run test         # all unit tests (engine + data-pipeline + web)
bun run e2e          # Playwright in Chromium (boots the dev server itself)
```

## Reference data (pinned, no drift)

SRD content is mined from the Foundry PF1 system, **pinned to an exact commit** and vendored as normalized JSON under `packages/data-pipeline/data/` (committed; the app builds offline). To update:

1. Edit `FOUNDRY_SHA` / `SYSTEM_VERSION` in `packages/data-pipeline/src/config.ts`.
2. `bun run data:fetch && bun run data:build`
3. Review the diff, commit.

Game content is OGL/Paizo Community Use; the engine is **clean-room** (not derived from Foundry's GPL code). See `DESIGN.md` §6.

## Where characters are stored

Currently **local only**: the working character autosaves to **IndexedDB** (database `pf1-tracker`) in your browser, and the app restores the most-recently-edited one on load. This means:

- It **survives dev-server and browser restarts**.
- It is **per-browser and tied to the `http://localhost:5173` origin** — a different browser, an incognito window, a different port, or clearing site data will not show it.
- There is **one active character** (no character-picker UI yet).

Stage 5 adds account-scoped cloud persistence + cross-device sync (the doc already carries `ownerId`/`version`/`updatedAt` for it).

# Ledgermain

A web-based **in-play character sheet, tracker, and builder** for Pathfinder 1e. The center of gravity is _play at the table_: a rules-aware tracker that recomputes correct numbers as session state (HP, conditions, buffs, resources) changes. Built to run on Cloudflare.

## Layout (bun workspaces)

```text
packages/schema         shared types: CharacterDoc, DerivedSheet, RefData
packages/data-pipeline  pinned Foundry fetch -> normalized JSON (vendored in data/)
packages/engine         pure rules engine (clean-room; the crown jewel)
apps/web                React + Vite builder + tracker ("illuminated ledger" UI)
```

## Run it

```bash
bun install
bun run dev          # -> http://localhost:5173  (copies RefData, then starts Vite)
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

Game content is OGL/Paizo Community Use; the engine is **clean-room** (not derived from Foundry's GPL code). See `DESIGN.md` Sec.6.

## License

Mixed license -- the thing distributed decides which terms apply, not the
file location:

- **MIT** -- all source code (engine, schema, data-pipeline scripts, web
  app, build/config). The engine is a clean-room reimplementation of the
  PF1 rules; the Foundry PF1 system's GPL-3.0 _code_ is never copied into
  this repo (its `.cache/` clone is gitignored and used only as a
  behavioral test oracle). See [`LICENSE`](./LICENSE).
- **Open Game License v1.0a** -- the vendored compendium JSON under
  `packages/data-pipeline/data/` (Open Game Content mined from the pinned
  Foundry PF1 system and the `bjschafer/pf1e-archetypes` dataset). See
  [`OGL.txt`](./OGL.txt).
- **Paizo Community Use Policy** -- some compendium entries reference Paizo
  Product Identity (deity names, Golarion ethnonyms/places); we rely on
  Paizo's Community Use Policy as the independent agreement contemplated
  by OGL Sec.7.

Full details, attribution, and the clean-room rationale live in
[`NOTICE.md`](./NOTICE.md). Not affiliated with Paizo Inc., Foundry
Gaming LLC, or Wizards of the Coast.

## Where characters are stored

Currently **local only**: the working character autosaves to **IndexedDB** (database `pf1-tracker`) in your browser, and the app restores the most-recently-edited one on load. This means:

- It **survives dev-server and browser restarts**.
- It is **per-browser and tied to the `http://localhost:5173` origin** -- a different browser, an incognito window, a different port, or clearing site data will not show it.
- There is **one active character** (no character-picker UI yet).

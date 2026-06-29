# Implementation Plan — PF1e In-Play Tracker

Companion to `DESIGN.md`. Stages are ordered to **de-risk the unknowns first** (data shape, then engine), then build UI on a proven foundation. Each stage should compile, pass tests, and be committable.

> **Licensing: DECIDED — clean-room (license-free).** The engine is reimplemented from the PF1 rules; Foundry's GPL code is used only as a behavioral test oracle, never copied. See DESIGN.md §6. Stage 2 is written accordingly.

---

## Stage 1: Data pipeline + schema

**Goal**: A reproducible build that turns the Foundry YAML packs into our own normalized JSON, for a vertical slice of content.

**Slice**: core races, 3–4 base classes (fighter, barbarian, wizard, cleric) with their `class-abilities` links resolved, the feats those need, and the spells for one class.

**Success Criteria**:
- `packages/schema` defines `RefData` types (Class, Race, Feat, Spell, Buff, Item).
- `packages/data-pipeline` reads `packs/**/*.yaml`, resolves `links.supplements` UUIDs and `@UUID[...]` refs, emits normalized JSON.
- Per-class spell lists derived by inverting `learnedAt.class`.
- Free-text feat prereqs parsed into structured form where possible; unparsed remainder retained as `prereqText`.
- Output is versioned and content-addressable (so updates are diffable).

**Tests**: snapshot tests on the slice; assert known facts (barbarian BAB=high, gets Rage at L1 via resolved link; Cleave lists Power Attack as a structured prereq; Fireball is wizard L3).

**Status**: Complete

**Notes / caveats (as built)**:
- Monorepo: `packages/schema` (`RefData` + members, `CharacterDoc`/`DerivedSheet` stubs) and `packages/data-pipeline` (pinned fetch → transform → emit). pnpm workspaces, TS strict, Vitest. 19 tests pass; 6 snapshots.
- **Pinning**: source SHA + system version live in `packages/data-pipeline/src/config.ts`. `pnpm data:fetch` does a shallow fetch of the exact SHA into a gitignored `.cache/`; `pnpm data:build` regenerates. Bumping data = edit `FOUNDRY_SHA`, re-run, review diff.
- **Vendoring**: normalized JSON committed under `packages/data-pipeline/data/` (key-sorted for stable diffs, per-file sha256 in `meta.json`). App builds with no network.
- **Slice as built**: 7 core races; 4 classes (fighter/barbarian/wizard/cleric) with `links.supplements` fully resolved into level-tagged grants (+ a `classFeatures` collection holding the resolved entries, e.g. Rage's `uses.maxFormula`); all 390 feats (curating wasn't simpler); 1897 wizard-learnable spells + inverted `wizard` spell list; 185 buffs; 111 items that carry typed-modifier `changes` (the engine-relevant subset of the 1124-item pack).
- **Feat prereqs**: hybrid parse — 262/390 feats yield structured signals (ability minimums, BAB, caster level, `@UUID` feat refs, best-effort skill ranks); full prose retained as `prereqText` (with `@UUID` enrichers resolved to display names). Skill-name → id mapping deferred (raw retained).

**For Stage 2 (rules engine)**:
- The typed-modifier model is already in the data: every `Change` is `{ formula, target, type }`. `type` is the stacking category (observed: `untyped`, `dodge`, `morale`, `racial`, `enhancement`, `deflection`). `target` covers ability scores (`str`/`dex`/…), `attack`, `ac`, `skill.<id>`, `cl`, and build-time targets like `bonusFeats`/`bonusSkillRanks`.
- **Formula DSL** to evaluate (clean-room): functions seen include `if`, `gte`, `min`, `max`; data paths like `@abilities.con.mod`, `@cl`, `@skills.acr.rank`, `@class.unlevel`, `@attributes.hd.total`, `@item.level`; and dice terms embedded in formulas, e.g. `(min(10, @cl))d6`. Resource pools use `maxFormula` (e.g. Rage `4 + @abilities.con.mod + (2 * (@class.unlevel - 1))`).
- `contextNotes` (`{ target, text }`) are non-mechanical reminders (e.g. "+2 vs Enchantment") — surface on the sheet, do not auto-apply.
- BAB/save numeric tables are NOT in the data (only the `high|med|low` / `high|low` tiers) — hardcode the three BAB and two save progressions in the engine.

---

## Stage 2: Rules engine core

**Goal**: `compute(doc, refData) -> DerivedSheet` for a static (no-buffs) character.

**Success Criteria**:
- Ability mods, BAB (tier tables), saves (tier tables + ability), AC (all components), CMB/CMD, skill totals (ranks + class-skill bonus + ability + ACP), HP.
- **Typed bonus-stacking** implemented per PF1 rules (highest-within-type; dodge & untyped stack; penalties stack).
- **Formula evaluator** for the DSL: `@data.paths`, `if/gte/min/max`, dice terms.
- (Per licensing decision) clean-room implementation validated against Foundry behavior as an oracle.

**Tests**: hand-computed fixtures for a L1 and a L5 build; targeted stacking tests (two morale bonuses don't stack; dodge+untyped do); formula evaluator unit tests.

**Status**: Not Started

---

## Stage 3: Builder MVP

**Goal**: Create a valid character from scratch through the UI, persisting to a local document.

**Success Criteria**:
- React app: ability score entry, race pick, class/level pick (multiclass-capable), skill rank allocation, feat selection (with prereq warnings, hard-block where structured), spell selection for casters.
- Builder writes the `CharacterDoc`; sheet view renders `compute()` output live.
- Document stored in IndexedDB (Dexie).

**Tests**: component tests for prereq gating; e2e "build a L1 fighter" produces expected derived sheet.

**Status**: Not Started

---

## Stage 4: In-play tracker

**Goal**: The differentiator — mutate live state at the table and watch correct numbers update.

**Success Criteria**:
- HP/temp/nonlethal controls; condition toggles that feed real modifiers into `compute()`.
- Buffs (from the `buffs` pack + user-authored) with **round-based durations** that count down; expired buffs auto-drop.
- Resource pools (spell slots, ki, rounds/day, charges) drain/restore; rest restores.
- Modified values show their provenance (which buff/condition contributed), with overridden bonuses struck through.

**Tests**: toggle Haste+Bless+prone → assert exact AC/attack/save deltas; advance N rounds → buff expires and stats revert.

**Status**: Not Started

---

## Stage 5: Persistence + cross-device sync (Level 1)

**Goal**: Save/load documents to Cloudflare, account-scoped, so a user can build on one device and play on another. Online-first. (See DESIGN.md §2.1.)

**Success Criteria**:
- **Lightweight identity**: GitHub OAuth or email magic-link; sessions in KV/D1. Documents are owned (`ownerId`).
- Cloudflare Worker stores/retrieves character-doc blobs (D1 or KV) behind a thin API; server stays dumb (no game logic).
- Client syncs IndexedDB ↔ server: pull latest on open, push on change.
- **Optimistic concurrency**: doc carries `version`/`updatedAt`; a save based on a stale `version` is rejected; client prompts to reload. (No merge engine — single-user multi-device.)
- Deployed on Pages + Workers.

**Tests**: round-trip a document; a save against a stale `version` is rejected (409) and the client surfaces the reload prompt; a fresh device pulls the latest doc for the owner.

**Status**: Not Started

---

## Deferred (de-risked by the architecture, not v1)

- **Party/GM session** — Durable Object per session; documents already self-contained.
- **Full offline PWA** — service worker + sync reconciliation; engine/doc already client-side.
- **Import** — Pathbuilder/Foundry JSON → `CharacterDoc`.
- **Homebrew authoring** — user entries in the same schema as SRD (the "expert flexibility" door).

# Archetypes — engine layer + builder/tracker UI (Stage 11.3–11.4)

Resuming Stage 11 (archetype support), picked back up after a prior session handed
off mid-way. 11.1 (schema + dual-pinned data source) and 11.2 (CSV ingestion: 182
archetypes / 805 features across fighter/barbarian/wizard/cleric/sorcerer) are
already committed (`2d828eb`, `9b5edd0`) — full as-built detail for those two
stages lives in their commit messages and in `packages/schema/src/refdata.ts`'s
`Archetype`/`ArchetypeFeature` doc comments. This doc only covers what's left.

**Recap of the posture** (see those commits for the full reasoning): Foundry ships
zero archetype data, so archetypes come from a third-party CSV dataset
(`bjschafer/pf1e-archetypes`, pinned). No numeric effects in v1 — archetype
features are structural/display-only (swap a base-class feature slot, or show
prose when the swap target is ambiguous). `pairedBaseFeatureUuid` is set only
when a `(classTag, level)` slot is unambiguous; cleric/wizard never pair (known,
correct, not a bug).

There is currently **no display of class features anywhere** in the app (not even
a plain list) — `collectModifiers` in `packages/engine/src/collect.ts` consumes
class-feature `changes` for stacking but nothing surfaces the feature list itself.
Archetypes are meaningless without that list to swap into, so 11.3 builds it as
part of this work, not as a prerequisite the plan can skip past.

## Stage 11.3: Engine derived layer

**Goal**: `compute()` resolves which class features a character has, and which are
struck through by an active archetype swap.

**Design**:
- `CharacterDoc.build.archetypes?: string[]` — chosen `Archetype.id`s (e.g.
  `"fighter:two-handed-fighter"`). No conflict validation in v1 (matches the
  project's soft-warning posture elsewhere) — multiple archetypes may be chosen
  even if their swaps overlap; last-applied-wins for a given slot is acceptable
  for v1 since PF1 archetype-stacking legality is itself a GM judgment call.
- New `packages/engine/src/archetypes.ts`: `resolveClassFeatures(doc, refData)` →
  `{ classFeatures: DerivedClassFeature[], activeArchetypes: DerivedArchetype[] }`.
  - `classFeatures`: every granted base-class feature up to current level (from
    `classDef.features`, mirroring the walk `collect.ts` already does), each
    tagged `applied: false` + `replacedBy: <archetype feature name>` when its
    `uuid` matches a chosen archetype's `pairedBaseFeatureUuid` — same
    strike-through shape as `ModifierComponent.applied` (`stacking.ts`), reused
    for consistency, not shared code (different domain).
  - `activeArchetypes`: one entry per chosen archetype — `{ id, name, classTag,
    swappedSlots: Record<level, pairedBaseFeatureUuid>, features:
    DerivedArchetypeFeature[] }`. `features` includes ALL of that archetype's
    features up to the class's current level, each flagged `ambiguous: true` when
    it has no `pairedBaseFeatureUuid` (prose-only display, no strike-through).
- `DerivedSheet` gains `classFeatures: DerivedClassFeature[]` and
  `activeArchetypes: DerivedArchetype[]`. Additive fields — no `SCHEMA_VERSION`
  bump (DerivedSheet is never persisted).
- `compute()` calls `resolveClassFeatures` once and spreads both fields into the
  returned sheet.

**Tests** (`packages/engine/test/archetypes.test.ts`, hand-fixture pattern):
- Two-Handed Fighter fixture (`fighter:two-handed-fighter`, level ≥ 7): Shattering
  Strike (L2) replaces Bravery → `classFeatures` has Bravery `applied: false,
  replacedBy: "Shattering Strike"`; `activeArchetypes[0].swappedSlots[2]` equals
  Bravery's grant uuid.
- No archetype chosen → every `classFeatures` entry `applied: true`,
  `activeArchetypes: []`.
- An archetype feature with no `pairedBaseFeatureUuid` (e.g. a cleric archetype
  feature) surfaces in `activeArchetypes[].features` with `ambiguous: true` and
  does NOT strike through anything in `classFeatures`.
- Level gating: an archetype feature above the character's current class level is
  excluded from both `classFeatures` swap application and `activeArchetypes.features`.

**Status**: Complete — `packages/engine/src/archetypes.ts` `resolveClassFeatures()`;
`DerivedSheet.classFeatures`/`activeArchetypes` wired into `compute.ts`; 8 hand-fixture
tests in `packages/engine/test/archetypes.test.ts` against real vendored data
(Two-Handed Fighter: Bravery struck through by Shattering Strike at L2, Armor
Training L3 struck through by Overhand Chop; level gating; cleric archetype
features — which never pair — surface as ambiguous without touching
`classFeatures`). No `SCHEMA_VERSION` bump (additive `DerivedSheet` fields; never
persisted). Repo gates green: typecheck (4 packages), `bun run test`
(170 engine + 45 data-pipeline + 271 web).

## Stage 11.4: Builder picker + tracker display

**Goal**: pick archetypes in the builder; see the resulting feature list (with
strikeouts) in the builder and/or tracker.

**Design**:
- `apps/web/src/model/doc.ts`: `setArchetypes(doc, ids)` (replace-whole-list, same
  shape as `setClericDomains`); `migrateDoc` backfills `build.archetypes ?? []`
  (no schemaVersion bump, matching the `clericDomains` precedent).
- `ArchetypePicker.tsx` (new, modeled on `DomainPicker.tsx`): renders per chosen
  class, lists that class's available archetypes (`refData.archetypes` filtered
  by `classTag`), free multi-select chips. Wire into `ClassesSection.tsx` next to
  `DomainPicker`.
- New `ClassFeaturesList.tsx` (or a subsection in `ClassesSection`): renders
  `sheet.classFeatures` grouped by level, struck-through when `applied: false`
  with a "→ replaced by <name>" note; renders each active archetype's own
  feature list beneath, with an "ambiguous — see description" soft-warning badge
  (reuses the existing prose-warning visual language from feat prereqs) instead
  of a hard swap.

**Tests**: `apps/web/src/model/archetypes.test.ts` — selection round-trips;
`migrateDoc` backfill; picker filters by class.

**Status**: Not started.

## Notes / deferred (carried over from the original Stage 11 write-up)

- Archetype *conflict* validation (can't legally combine two archetypes that
  swap the same slot) — deferred; same soft-warning posture as feat prereqs.
- Numeric effects from archetype features — deferred; dataset's `Description`
  prose has verified copy-paste errors (Two-Handed Fighter's "Shattering Strike"
  row carries Bravery's text) so it's display-only, never a mechanics source.
  Any future numeric effect must be hand-authored from the published rules,
  same as `feat-effects.ts`/`tables.ts`.
- `AGENTS.md`/`DESIGN.md` doc updates (originally sub-stage 11.5) — fold into
  whichever of 11.3/11.4 lands the user-visible behavior, not a separate stage.

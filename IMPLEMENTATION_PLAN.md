# Implementation Plan: Sorcerer bloodlines, wizard schools, arcane bonds

Three PF1e spellcaster class features are currently unimplemented (audit, 2026-07-01):

- **Sorcerer bloodlines** — no schema field, no engine logic, no UI. The *only* surviving surface is bonus-feat **slot counting** (`apps/web/src/model/feats.ts` reads the `bonusFeats` change from the prose-only "Bloodline Feat (SOR)" class feature). The spell associations already exist in vendored data (`spells.json` carries `learnedAt.bloodline` for 39 bloodlines across 220 spells in the current slice) but the pipeline does **not** invert them.
- **Wizard specialization schools** — no schema field, no slot mechanic (specialist +1 school slot/level, opposition spells cost 2 slots), no UI. "Arcane School" is a prose-only `ClassFeature` (`changes: []`); no per-school power data is vendored.
- **Arcane bonds** — no schema field, no familiar skill bonuses, no concentration-without-bonded-object penalty, no UI. "Arcane Bond" is prose-only. No familiar stat blocks are vendored anywhere.

The shared root cause: Foundry models each as a single prose-only `ClassFeature` with no structured sub-entries for the actual choices (which bloodline, which school, familiar vs. bonded object). The placeholder `build.classFeatureChoices: unknown[]` (`packages/schema/src/character.ts:65`) exists but is untyped, always `[]`, and read by no code. We will **not** use it — each feature gets a *named* field, mirroring the working cleric-domain precedent (`build.clericDomains` + `refData.domainSpellLists` + `PreparedSpell.kind === "domain"`).

### Ordering / tractability

The three features differ sharply in how much vendored data we can lean on, which sets the staging:

| Feature | Vendored data we can lean on | Hand-authoring burden |
|---|---|---|
| Sorcerer bloodline **spells** | ✅ `spells.json.learnedAt.bloodline` (39 bloodlines, 220 spells in the current slice — verified 2026-07-02; grows slightly once the keep-filter retains bloodline-only spells) — just needs a pipeline inversion mirroring the domain one | none |
| Sorcerer bloodline **arcana/powers** | ❌ not vendored (prose-only feature) | per-bloodline Change sets, clean-room |
| Wizard school **slots/opposition** | ❌ no `arcane-schools` pack read; only spell `school` tag (abj/evo/...) | 8 school tags (trivial); school *powers* are prose |
| Arcane bonds | ❌ no familiar stat blocks anywhere | full familiar table, clean-room |

So: bloodline **spells** first (pure pipeline + schema + UI, mirrors domains exactly), then wizard **school slots** (schema + engine slot mechanic + UI; no new data needed), then **arcane bonds** (largest hand-authoring). Bloodline **arcana/powers** and school **powers** (the passive-ability effects) are deferred to a final stage — they're real but not table-blocking, and each school/bloodline has prose-only data we'd have to hand-transcribe clean-room.

### Licensing note (DESIGN §6)

Per-school powers, bloodline arcana/powers, and familiar stat blocks are **not** in the vendored Foundry content. They must be **hand-authored clean-room from the published PF1 rules**, never copied/transcribed from Foundry's GPL system code. The precedents are `packages/engine/src/tables.ts` (hardcoded BAB/save/spell-progressions) and `packages/engine/src/feat-effects.ts` (hand-authored feat change sets). Each stage that hand-authors data adds a new such file.

---

## Stage 1: Sorcerer bloodline spells (data + schema + UI)

**Goal**: Sorcerers pick a bloodline in the builder; bloodline bonus spells auto-populate the known list as the sorcerer levels (one per odd sorcerer level starting at 3), do **not** count against the spells-known cap, and render with a "bloodline" badge. Mirrors the cleric domain system end-to-end and is the template Stages 2–3 reuse.

**Scope** (in / out):
- IN: Pipeline inversion `learnedAt.bloodline` → `refData.bloodlineSpellLists` (mirror `normalize.ts:142-163` domain block exactly), emitted as `bloodline-spell-lists.json`. Extend the spell-slice keep filter (`normalize.ts:110-125`) so bloodline-only spells are retained (mirror the existing `hasDomain` term).
- IN: Schema `RefData.bloodlineSpellLists: Record<string, SpellList>` (mirror `refdata.ts:37`).
- IN: Schema `build.sorcererBloodline?: string` (mirror `build.clericDomains?: string[]` at `character.ts:57`).
- IN: Engine/Model: `bloodlineSpellsKnown(refData, bloodlineTag, sorcererLevel) -> string[]` in `apps/web/src/model/spellcasting.ts`. PF1 rule: a bloodline's level-`L` spell (1–9) is unlocked at sorcerer level `2L+1`. Returns spell ids the sorcerer has unlocked, sorted.
- IN: Builder UI: a `BloodlinePicker.tsx` rendered in `ClassesSection.tsx` for sorcerers (mirror `DomainPicker.tsx`). Dropdown of `Object.keys(refData.bloodlineSpellLists)`; chosen tag persisted via a `setSorcererBloodline` transition in `doc.ts` (mirror `setClericDomains` at `doc.ts:118`).
- IN: Known-list rendering (`SpellsSection.tsx` / wherever the sorcerer's known spells are listed): merge `bloodlineSpellsKnown` into the displayed known list with a "bloodline" badge; exclude them from the spells-known *cap* check (they're bonus known, not chosen known).
- OUT: Bloodline **arcana** and **powers** (passive abilities like Draconic's breath weapon, +1 HP/HD from Fey, etc.) — deferred to Stage 4.
- OUT: Bloodline bonus **feat** selection — the *slot count* is already correct (audit A6); picking *which* bloodline feat fills the slot is a feat-picker concern that defers with Stage 4 (the feat list per bloodline isn't vendored).
- OUT: Wildblooded /crossblooded variants — non-core, defer.

**Schema change** (`packages/schema/src/refdata.ts`):

```ts
// Mirror domainSpellLists at lines 31-37.
/**
 * Per-bloodline spell lists, keyed by bloodline tag (e.g. "Draconic",
 * "Abyssal") → spell level → spell ids. Inverted from `Spell.learnedAt.bloodline`.
 * A sorcerer's chosen bloodline grants one bonus spell known per odd sorcerer
 * level starting at 3 (level-`L` bloodline spell unlocked at sorcerer level
 * `2L+1`); these do not count against the spells-known cap. Empty for non-sorcerer
 * slices. 39 bloodlines in the current vendored slice.
 */
bloodlineSpellLists: Record<string, SpellList>;
```

`packages/schema/src/character.ts` (inside `build:`):

```ts
/**
 * Sorcerer bloodline tag (key into `refData.bloodlineSpellLists`), chosen at L1.
 * Free-choice since the vendored data carries no sorcerer-heritage mapping —
 * matches the project's hybrid soft-warning posture (see clericDomains above).
 * Empty/undefined for non-sorcerers. The chosen bloodline grants bonus spells
 * known at odd sorcerer levels ≥3 (see model/spellcasting.bloodlineSpellsKnown).
 * Back-compat: documents without this field are unaffected.
 */
sorcererBloodline?: string;
```

`schemaVersion` stays at its current value — fields are optional + additive; no migration. (Same posture as the GM Grants stage.)

**Pipeline change** (`packages/data-pipeline/src/normalize.ts`):

Mirror the domain block at lines 142-163 verbatim, a few lines below it:

```ts
// --- per-bloodline spell lists (invert learnedAt.bloodline) -----------------
// A sorcerer's chosen bloodline grants bonus spells known at odd sorcerer
// levels ≥3, drawable from this list. Bloodline-only spells (e.g. a spell
// tagged "Abyssal" but not on the sorcerer class list) would otherwise be
// dropped by the slice filter above — keep any spell with a non-empty
// bloodline entry, mirroring the domain retain-term.
const bloodlineTags = new Set<string>();
for (const spell of spells) {
  for (const tag of Object.keys(spell.learnedAt.bloodline ?? {})) bloodlineTags.add(tag);
}
const bloodlineSpellLists: Record<string, SpellList> = {};
for (const tag of bloodlineTags) {
  const list: SpellList = {};
  for (const spell of spells) {
    const lvl = spell.learnedAt.bloodline?.[tag];
    if (lvl === undefined) continue;
    (list[lvl] ??= []).push(spell.id);
  }
  for (const lvl of Object.keys(list)) list[Number(lvl)]!.sort();
  bloodlineSpellLists[tag] = list;
}
```

Also extend the spell-slice keep filter (lines 110-125) — add a `hasBloodline` term so bloodline-only spells survive the slice (mirror the existing `hasDomain` term). In practice most bloodline spells are also on the sorcerer class list, but a strict mirror of the domain pattern is correct + forward-safe.

Wire into `RefData` returned object (line 234-249) and the `counts` block (lines 207-220, add `bloodlineSpellLists`). Add the emit row in `packages/data-pipeline/src/emit.ts` `FILES` (line 29-43):
`{ key: "bloodlineSpellLists", file: "bloodline-spell-lists.json" }`.

**Both RefData loaders must learn the new file** (the domain precedent touched all of these — verified 2026-07-02):
- `packages/data-pipeline/src/index.ts:32` — add `bloodlineSpellLists: readJson(dir, "bloodline-spell-lists.json")` (Node loader, used by engine tests).
- `apps/web/src/refdata/loader.ts` — add the fetch row (mirror `domain-spell-lists.json` at lines 37/52/68).
- `packages/data-pipeline/src/config.ts:29` — bump `SCHEMA_VERSION` 4 → 5 and extend its comment ("v5 adds `bloodlineSpellLists`"), same convention as the v4 domain bump.

Regen: `bun run data:build`. Review the diff — expect ~39 bloodline entries.

**Engine changes** — none. `compute()` is unchanged; bloodline spells are a builder/tracker display concern (they expand the known list, not a derived stat). The engine's spells-known **table** (the cap) is untouched — bloodline spells are *bonus* known and sit outside the cap, enforced at the UI layer. (Same posture as `gmGrants`, which lives entirely in the web model layer.)

**Model transitions** (`apps/web/src/model/doc.ts`):

```ts
setSorcererBloodline(doc, tag | null): CharacterDoc   // null = clear
```

Mirror `setClericDomains` (doc.ts:118) shape; single tag (not array). Clamp to one tag; ignore blank/whitespace (mirror `setClericDomains` blank-stripping at `preparedSpells.test.ts:278-285`). No validation that the tag exists in `refData.bloodlineSpellLists` (soft-warning posture, same as domains).

**Model logic** (`apps/web/src/model/spellcasting.ts`):

```ts
/**
 * Bloodline bonus spells known at `sorcererLevel` for the given `bloodlineTag`.
 * PF1 rule: a bloodline's level-`L` spell (1-indexed spell level) is unlocked
 * at sorcerer level `2L+1`. Returns the ids of unlocked bloodline spells (only
 * those whose spell level ≤ floor((sorcererLevel-1)/2)). Empty if the tag is
 * unknown to refData or the sorcererLevel is below 3. Sorted by name.
 *
 * These are *bonus* spells known — the builder adds them to the displayed
 * known list automatically and they do NOT count against the spells-known cap.
 *
 * @example
 *   bloodlineSpellsKnown(ref, "Draconic", 7)  // → spells of level 1..3
 *   bloodlineSpellsKnown(ref, "Draconic", 2)  // → []  (starts at L3)
 */
export function bloodlineSpellsKnown(
  refData: RefData,
  bloodlineTag: string | undefined,
  sorcererLevel: number,
): { id: string; name: string; level: number }[]
```

Implement: read `refData.bloodlineSpellLists[tag]` keys 1-9; include level `L` only when `2L+1 <= sorcererLevel` (i.e. `L <= (sorcererLevel - 1)/2`). Returns `[]` gracefully when `tag` is undefined/unknown.

**UI** (`apps/web/src/components/builder/`):
- `BloodlinePicker.tsx` — dropdown (`<select>`) of `Object.keys(refData.bloodlineSpellLists).sort()`. One tag can be chosen/none. Mirrors `DomainPicker.tsx`'s free-choice + soft-warning shape (no deity lock).
- `ClassesSection.tsx` — render `BloodlinePicker` when the character has sorcerer levels (gate checks `casterModelFor("sorcerer"` or class list), next to the existing `DomainPicker` cleric branch (around line 197-200).
- Spells-known display: merge `bloodlineSpellsKnown` into the known list for the cap check (subtract from / exempt them), and render them with a "bloodline" badge (mirror whatever "domain" badge markup exists). They're read-only — not user-removable.
- Tracker: the spontaneous cast surface builds its castable list from `build.spells.known` (`PreparedSpellsPanel.tsx:276-289` `knownByLevel`) — merge `bloodlineSpellsKnown` there too, or the sorcerer can't cast their bloodline spells at the table.

**Success Criteria**:
- `bun run typecheck` green.
- `bun run data:build` regenerates `bloodline-spell-lists.json` with ~40 bloodline entries; `git diff` on the data dir reviewed.
- `bun run test` green; existing fixtures unchanged; new tests pass.
- Builder: a sorcerer 7 with `sorcererBloodline = "Draconic"` shows three bonus bloodline spells (levels 1, 2, 3) in the known list with a "bloodline" badge, and the spells-known cap counts them as exempt — i.e. the player can still add the same number of chosen known spells as a non-bloodlined sorcerer 7.
- Persistence: reload the page; the bloodline tag and the auto-granted known spells are still there (exercises Dexie + export/import JSON, unchanged since the field is additive).
- Soft warning: choosing an unknown bloodline tag (typed into a malformed import JSON) shows a soft warning, never hard-blocks.

**Tests** (red-first per the workflow):
- `packages/data-pipeline/test/normalize.test.ts` (or wherever pipeline tests live): `bloodlineSpellLists["Draconic"]` is non-empty and contains the expected known DD-spell at level 1; bloodline-only spells survive the slice (regression for the keep-filter extension).
- `apps/web/test/spellcasting.test.ts`: `bloodlineSpellsKnown(ref, "Draconic", 1)` → `[]`; `(ref, "Draconic", 3)` → one 1st-level spell; `(ref, "Draconic", 7)` → levels 1..3; `(ref, "Unknown" , 20)` → `[]` (soft fail, no throw); `(ref, undefined, 20)` → `[]`.
- `apps/web/test/doc.bloodline.test.ts` (new): `setSorcererBloodline` set, clear, blank-stripping.
- Regression: a doc **without** `sorcererBloodline` produces an identical builder display + spells-known cap to before (guards back-compat).
- One engine-fixture regression asserting `compute()` output is byte-identical with/without `sorcererBloodline` (the engine ignores the field by design — this test pins that).

**Files touched** (estimate):
1. `packages/schema/src/refdata.ts` — `RefData.bloodlineSpellLists` + JSDoc.
2. `packages/schema/src/character.ts` — `build.sorcererBloodline` + JSDoc.
3. `packages/data-pipeline/src/normalize.ts` — keep-filter term + inversion block + `RefData` return + `counts`.
4. `packages/data-pipeline/src/emit.ts` — one `FILES` row.
5. `packages/data-pipeline/src/index.ts` — one `readJson` row (Node loader).
6. `packages/data-pipeline/src/config.ts` — `SCHEMA_VERSION` 4 → 5.
7. `apps/web/src/refdata/loader.ts` — one fetch row (browser loader).
8. `packages/data-pipeline/data/bloodline-spell-lists.json` — regenerated (committed), plus `meta.json` regen.
9. `apps/web/src/model/doc.ts` — `setSorcererBloodline`.
10. `apps/web/src/model/spellcasting.ts` — `bloodlineSpellsKnown`.
11. `apps/web/src/components/builder/BloodlinePicker.tsx` — new.
12. `apps/web/src/components/builder/ClassesSection.tsx` — wire picker.
13. `apps/web/src/components/builder/SpellsSection.tsx` — merge bloodline spells into known + badge + cap-exemption.
14. `apps/web/src/components/tracker/PreparedSpellsPanel.tsx` — merge bloodline spells into the spontaneous castable list.
15. Three test files as above.

**Status**: Complete (2026-07-02). As-built notes:
- `bloodlineSpellLists` landed as v5 (`SCHEMA_VERSION` 4→5); 39 bloodlines, 2442 spells (18 more than before — bloodline-only spells retained by the extended keep-filter).
- `BloodlinePicker.tsx` uses a `<select>` dropdown (single tag) rather than the chip-toggle style `DomainPicker.tsx` uses for its two-tag choice — simpler UI for a single free-choice value.
- Bloodline spells render as a read-only reference block in `SpellsSection.tsx` (mirrors the existing `DomainSpellsBlock` pattern) rather than being merged into the toggleable `known` list — since they're never added to `doc.build.spells.known`, they're naturally exempt from the spells-known cap by construction (no separate exemption bookkeeping needed). Each spell row carries a `.tag-bloodline` badge.
- The tracker wiring landed in `PreparedSpellsPanel.tsx`'s `SpontaneousView` (the sorcerer's actual render path) rather than `PreparedView` — the plan's line reference (276-289) pointed at `PreparedView`'s `knownByLevel`, which only renders for prepared casters (wizard/cleric); sorcerer uses the separate spontaneous-caster view, whose analogous `knownByLevel` block got the merge instead.
- Engine regression test lives at `packages/engine/test/sorcererBloodline.test.ts` (new file, since no prior engine test built its own minimal doc fixture for this kind of ignored-field pin).

---

## Stage 2: Wizard specialization schools (slots + opposition)

**Goal**: A wizard picks one specialization school (or "Universalist") and two opposition schools (none if Universalist). The specialist gets **one bonus prepared slot per spell level (1–9, not cantrips)** that must be filled from their school's spell list; opposition-school spells cost **two slots** to prepare. UI renders school slots next to the existing normal slots (mirroring the cleric domain slot rendering). School *powers* — the passive arcane-school abilities (diviner's foresight, evoker's elemental damage, etc.) — are **deferred** to Stage 4.

> **PF1 RAW check (corrected 2026-07-02)**: a Universalist gets **no** bonus slot and no opposition schools — their compensation is the Hand of the Apprentice / Metamagic Mastery school powers, which defer to Stage 4 with all other school powers. Only specialists (the eight non-"uni" tags) get the +1 school slot per level. This simplifies the slot logic: `kind: "school"` slots exist only when `wizardSchool` is set and ≠ `"uni"`.

**Scope** (in / out):
- IN: Schema `build.wizardSchool?: string` (school tag: `"abj" | "con" | "div" | "enc" | "evo" | "ill" | "nec" | "trs" | "uni"`). Free-choice; no "oppose X requires school Y" validation (soft-warning posture).
- IN: Schema `build.wizardOppositionSchools?: string[]` (≤2 tags; empty/omitted for Universalist).
- IN: Schema: extend `PreparedSpell.kind` (`character.ts:222`) from `"normal" | "domain"` to `"normal" | "domain" | "school"`. `"school"` slots may only hold spells whose `spell.school` tag equals the wizard's specialization; one per accessible spell level (mirror domain slot exclusivity).
- IN: Model: opposition-preparation cost. A prepared spell with `spell.school ∈ oppositionSchools` consumes 2 normal slots of its level (PF1 RAW). Implemented in the prepare/spell-accounting model (`apps/web/src/model/` — wherever domain slot counting lives).
- IN: Builder UI: `SchoolPicker.tsx` (8 schools + Universalist); `OppositionPicker.tsx` (pick ≤2; disabled when Universalist). Wire in `ClassesSection.tsx` next to the sorcerer-bloodline branch from Stage 1.
- IN: Tracker UI: `PreparedSpellsPanel.tsx` renders one "school slot" per accessible spell level (when specialist), sourced from `refData.spellLists["wizard"]` filtered by `spell.school === wizardSchool'.
- OUT: School **powers** (arcane-school passive abilities). Defer to Stage 4. This includes the Universalist's Hand of the Apprentice / Metamagic Mastery — a Universalist gets **no bonus slot** (see RAW check above), so choosing "uni" changes nothing mechanically in this stage beyond disabling the opposition picker.
- OUT: Archetype interactions that alter/swap arcane school (`wizard:bonded-wizard`, `wizard:familiar-adept`, etc. — prose-only in `archetype-features.json`). Surface as a soft warning only.

**Schema change** (`packages/schema/src/character.ts`):

```ts
/**
 * Wizard specialization school tag. One of the eight PF1 schools
 * ("abj","con","div","enc","evo","ill","nec","trs") or "uni" (Universalist —
 * no opposition schools, no bonus slot). Free-choice; the vendored Foundry data
 * has no per-school mapping of school features. Default undefined = Universalist
 * (back-compat: existing wizard docs load as Universalist).
 *
 * A specialist (any non-"uni" tag) gains one bonus prepared slot per accessible
 * spell level 1–9 (rendered with `PreparedSpell.kind === "school"`), exclusive
 * to spells of that school, plus two opposition schools (see
 * `wizardOppositionSchools`). A Universalist gains NO bonus slot (PF1 RAW —
 * their compensation is school powers, deferred).
 */
wizardSchool?: "abj" | "con" | "div" | "enc" | "evo" | "ill" | "nec" | "trs" | "uni";
/**
 * Two opposition school tags for a specialist wizard; empty/omitted for
 * Universalist. Opposition-school spells cost two normal slots to prepare
 * (PF1 RAW). Free-choice (no school-vs-opposition validation — soft-warning
 * posture, matching the cleric domain free-choice policy).
 */
wizardOppositionSchools?: string[];
```

`PreparedSpell.kind` (`character.ts:222`):

```ts
kind?: "normal" | "domain" | "school";
```

`schemaVersion` unchanged (additive, optional; back-compat docs load as Universalist).

**Engine changes** — none. Slot accounting is a builder/tracker model-layer concern, not a derived stat (mirrors how domain slots work — the engine's `compute()` is unaware of domain slots; the `PreparedSpellsPanel` + the model layer enforce exclusivity). Oppose-cost (2 slots) is enforced in the prepare model, not the engine.

**Model transitions** (`apps/web/src/model/doc.ts`):

```ts
setWizardSchool(doc, tag | null): CharacterDoc
setWizardOppositionSchools(doc, tags: string[] | null): CharacterDoc   // caps at 2; ignores blanks
```

Mirror `setClericDomains` shape + blank-stripping. `setWizardSchool("uni")` clears `wizardOppositionSchools` (a Universalist has none); `setWizardSchool(other)` leaves opposition alone (player must set them).

**Model logic** (`apps/web/src/model/` — wherever prepared-spell accounting lives):

- `isSchoolSlotEligible(spell, doc)` — true when `spell.school === doc.build.wizardSchool`. No school slots exist for Universalist or when no school is chosen (both mean `kind: "school"` slots simply don't render).
- `oppositionCost(spell, doc)` — returns 1 (normal) or 2 (when `spell.school ∈ doc.build.wizardOppositionSchools`). Refine the existing slot-counting loop so opposition-prepared spells consume 2.
- School slot capacity: one `kind: "school"` slot per accessible spell level 1–9 (never level 0), specialists only — mirror the cleric domain-slot accounting in `PreparedSpellsPanel.tsx` (`DomainSlotsSection`), which keeps domain slots out of the normal-slot capacity via `kind`.

**UI** (`apps/web/src/components/builder/`):
- `SchoolPicker.tsx` — 9-option `<select>` (8 schools + Universalist). When non-Universalist, reveal `OppositionPicker` (multi-pick ≤2 from the remaining 7 schools).
- `ClassesSection.tsx` — render both for wizards, next to the sorcerer-bloodline branch.
- `PreparedSpellsPanel.tsx` — render one "school slot" row per accessible spell level 1–9 (specialists only), mirroring the existing `DomainSlotsSection`. The slot is exclusive to in-school spells (filtered picker). No school-slot rows for Universalist.
- Tracker spell-cost surface: when preparing an opposition-school spell, the UI shows "costs 2 slots" badge and the prepare action decrements 2 normal slots.

**Success Criteria**:
- `bun run typecheck && bun run test` green; existing fixtures unchanged; new tests pass.
- Builder: a wizard 5 Evocation specialist picks Evocation + opposition {enchantment, necromancy}; the Spells panel shows one school slot per accessible spell level 1–3 (wizard 5 casts up to 3rd) exclusive to evo spells; preparing Burning Hands (evo) into a school slot works; preparing Sleep (enc, opposition) into a normal slot consumes 2 normal slots.
- Universalist wizard 5: no school slots, no opposition picker, opposition-cost is 1 for everything — mechanically identical to a doc with no `wizardSchool` at all.
- Persistence: reload page; school + opposition choices persist (additive optional fields, no migration).
- Back-compat: an existing wizard doc with no `wizardSchool` loads as Universalist with identical derived stats to before the change.

**Tests**:
- `apps/web/test/doc.school.test.ts` (new): set/clear/blank-strip for `wizardSchool` + `wizardOppositionSchools`; setting "uni" clears opposition; cap at 2 opposition schools.
- Model accounting tests: `oppositionCost(sleep, evocation-with-enc-opposition-doc) === 2`; `oppositionCost(burningHands, same-doc) === 1`; `isSchoolSlotEligible(burningHands, evocation-doc) === true`, `(sleep, evocation-doc) === false`; `(anySpell, universalist-doc) === false` (Universalist has no school slots).
- `apps/web/test/preparedSpells.test.ts`: extend an existing slot-accounting test (or add one) — specialist preparing an opposition spell into a normal slot consumes 2; into a school slot is rejected (in-school only).
- Regression: an engine fixture with `wizardSchool` set produces byte-identical `compute()` output (the engine ignores the field by design — pins that).

**Files touched**:
1. `packages/schema/src/character.ts` — two build fields + `PreparedSpell.kind` extension + JSDoc.
2. `apps/web/src/model/doc.ts` — two transitions.
3. `apps/web/src/model/` (prepare accounting module) — `isSchoolSlotEligible`, `oppositionCost`, `schoolSlotCapacity`.
4. `apps/web/src/components/builder/SchoolPicker.tsx` — new.
5. `apps/web/src/components/builder/OppositionPicker.tsx` — new (or fold into SchoolPicker).
6. `apps/web/src/components/builder/ClassesSection.tsx` — wire pickers for wizards.
7. `apps/web/src/components/tracker/PreparedSpellsPanel.tsx` — school-slot rows + opposition-cost badge.
8. Three test files as above.

**Status**: Complete. As-built notes:
- `SCHOOL_LABELS`/`SCHOOL_TAGS` (school tag → display label) ended up centralized
  in `apps/web/src/model/spellcasting.ts` rather than `SchoolPicker.tsx` — the
  builder's existing `SpellsSection.tsx` already had a local (and drifted —
  "Universal" vs "Universalist") copy for its browse-by-school filter chips;
  consolidated to one source of truth (plus a `schoolLabel()` helper for the
  untyped `Spell.school` string) instead of shipping a second copy.
- Opposition cost is accounted by weighting each normal-slot `PreparedRow` with
  a `cost` (1 or 2) and summing per level, rather than a separate slot kind —
  matches the plan's "refine the existing slot-counting loop" note. The
  per-level header now reads `usedCapacity/total prepared` (cost-weighted)
  instead of a raw instance count.
- Switching a specialist to Universalist (or to a different school) does not
  purge now-orphaned `kind: "school"` prepared instances from `live.spells`;
  they simply stop rendering (no UI section to show them in). Harmless
  (excluded from normal-slot capacity either way) but noted as a minor gap —
  a future "rest"/re-prepare already clears the whole loadout if it matters.
- Manually verified end-to-end in a real browser (Playwright, dev server): a
  wizard 5 Evocation specialist opposing Enchantment/Necromancy shows School
  Slots L1–L3, prepares Burning Hands into a school slot (1/1), preparing
  Sleep into a normal slot shows a "COSTS 2 SLOTS" badge and the L1 header
  reads 2/3 prepared; switching to Universalist hides both the opposition
  picker and the School Slots section.

---

## Stage 3: Arcane bonds (familiar + bonded object)

**Goal**: A wizard (or sorcerer with the Tattooed Sorcerer archetype — defer that interaction) records an arcane bond: a *familiar* or a *bonded object*. Familiars grant their published master bonus (e.g. bat → +3 Fly, toad → +3 hit points). Bonded objects record the choice; their main RAW pain ("cast any spellbook spell 1/day"; "concentration DC 20 + spell level without the object") is surfaced as a play-tab tooltip, **not** modeled numerically in v1. Familiar stat blocks are hand-authored clean-room (none are vendored).

**Scope** (in / out):
- IN: Schema `build.arcaneBond?: { type: "familiar" | "object"; familiarKind?: string; bondedItemRef?: string }`. `familiarKind` keys into the hand-authored familiar table. `bondedItemRef` is an `ItemInstance.id` (player's own gear) for the bonded object; optional in v1 (player may record "bonded object" without specifying which item).
- IN: Hand-authored familiar table — new engine data file `packages/engine/src/familiars.ts` (mirrors the hand-authored shape of `tables.ts` / `feat-effects.ts`). The PF1 Core familiar list with each familiar's **master bonus** (corrected 2026-07-02 — the earlier draft listed 3.5e values; PF1 CRB values are): bat +3 Fly, cat +3 Stealth, lizard +3 Climb, monkey +3 Acrobatics, rat +2 Fortitude saves, raven +3 Appraise, viper +3 Bluff, toad +3 hit points, weasel +2 Reflex saves; hawk (+3 sight-based Perception in bright light) and owl (+3 sight-based Perception in shadows) are *conditional* — model those two as a display note, not an always-on `Change`. Bonuses are expressed as `Change`s with engine target names (`skill.fly`, `skill.ste`, `skill.clm`, `skill.acr`, `skill.apr`, `skill.blf`, `fort`, `ref`, `hp` — all already-consumed targets, verified in `targets.ts`/`feat-effects.ts`) and type `"untyped"` (PF1 gives these bonuses no type; matches the `feat-effects.ts` precedent, e.g. Alertness). **Clean-room from published PF1 rules** (DESIGN §6) — never transcribe Foundry source.
- IN: Engine: apply the chosen familiar's skill-bonus `Change`s through the existing change-application path (`collect.ts` / `compute.ts` — wherever buff/feat changes get applied). The familiar is sourced from `build.arcaneBond.familiarKind` + the familiar table by id.
- IN: Builder UI: `ArcaneBondPicker.tsx` — toggle bond type; if familiar, a `<select>` over the hand-authored familiar table; if object, a free-text/item-ref picker (v1: free-text name; wiring to an existing `ItemInstance` deferred).
- IN: tracker UI: the sheet's "race/class features" panel surfaces "Familiar: bat — +3 Fly" (or the `note` for hawk/owl); bonded object shows "Bonded Object: <name or record>" plus an inline tooltip explaining the 1/day spontaneous-cast-from-spellbook and the no-object concentration penalty.
- OUT: Improved Familiar feat integration (the feat grants access to higher-tier familiars at level 5/7/etc.) — defer; in v1 the picker shows the base list regardless. Soft-warning only.
- OUT: The master's Alertness while the familiar is within arm's reach (situational, on/off at the table) — surface as a display note on the familiar row, not an applied `Change`.
- OUT: Familiar **HP/master-share mechanics** (familiar uses master's HP, half the master's level as HD, share saves, etc.) — these areNPC stat-block concerns the character sheet doesn't render. Defer indefinitely.
- OUT: Bonded object "cast any spellbook spell 1/day" as a play action — defer (live action, not a derived stat). Tooltip-only in v1.
- OUT: Concentration-without-bonded-object penalty as a live-computed DC — defer; the tooltip surfaces the formula. (Add to engine `concentration` target work already parked under audit C2.)

**Schema change** (`packages/schema/src/character.ts`):

```ts
/**
 * Arcane bond chosen at L1 by wizards (and by some sorcerer archetypes — defer
 * the archetype gate in v1). A familiar grants a published skill bonus (see
 * the hand-authored table in engine/familiars.ts); a bonded object records the
 * player's choice and surfaces RAW mechanics as a tooltip (the 1/day
 * spellbook-spell cast and the DC 20 + spell level concentration check when
 * casting without it are NOT modeled numerically in v1).
 *
 * `familiarKind` keys into the engine's fam-id table; `bondedItemRef` is a
 * reference into `build.gear` (an `ItemInstance.id`) — optional in v1 (a
 * player may record "bonded object" without pinning the item). Back-compat:
 * documents without `arcaneBond` are unaffected.
 */
arcaneBond?: {
  type: "familiar" | "object";
  /** Present iff `type === "familiar"`. Keys into engine familiar table. */
  familiarKind?: string;
  /** Present iff `type === "object"`; an `ItemInstance.id` from `build.gear`. */
  bondedItemRef?: string;
};
```

`schemaVersion` unchanged (additive optional).

**Engine changes** — apply the familiar's skill-bonus changes:

- New file `packages/engine/src/familiars.ts`: exports `FAMILIARS: Record<string, { name: string; changes: Change[]; note?: string }>`. Each familiar's `changes` is a small, hand-authored set (e.g. bat → `[{ target: "skill.fly", formula: "3", type: "untyped" }]`; toad → `[{ target: "hp", formula: "3", type: "untyped" }]`). `note` carries conditional/prose bonuses (hawk, owl) for display. Use the existing `Change` shape so the bonuses route through `stacking.ts` (untyped bonuses always sum — matches PF1 RAW for these).
- `collect.ts`: add a familiar block (mirror the feats block at `collect.ts:150-176`) — when `doc.build.arcaneBond?.type === "familiar"`, look up `FAMILIARS[doc.build.arcaneBond.familiarKind]` and `evalChange` its `changes`. Familiars with no entry in the table → soft warning, no crash.

**Model transitions** (`apps/web/src/model/doc.ts`):

```ts
setArcaneBond(doc, bond: { type: "familiar" | "object"; familiarKind?: string; bondedItemRef?: string } | null): CharacterDoc
```

`null` clears the bond. Setting `type: "familiar"` requires `familiarKind` (transition asserts non-blank; soft warning only if the kind isn't in the table). Setting `type: "object"` with `bondedItemRef` validates that the ref exists in `doc.build.gear` (if not — soft warning, not a hard block).

**UI** (`apps/web/src/components/`):
- `builder/ArcaneBondPicker.tsx` — toggle (two radio buttons). If familiar: dropdown over `Object.keys(FAMILIARS)` (imported from the engine). If object: text input for the bonded object's display name + optional `gear` picker (v1: name only).
- `builder/ClassesSection.tsx` — render for wizards (and once archetypes are wired, Tattooed Sorcerer — defer the archetype gate).
- `tracker/` (wherever the character's class-feature surface is rendered — likely the play-tab class-features panel): "Familiar: bat" row with the bonus provenance (e.g. "+3 Fly (bat familiar)"), or the conditional `note` for hawk/owl. Bonded object row with the tooltip explaining the raw mechanics (1/day cast + concentration DC 20 + spell level when casting without it).

**Success Criteria**:
- `bun run typecheck && bun run test` green; existing fixtures unchanged; new tests pass.
- Builder: a wizard with `arcaneBond = { type: "familiar", familiarKind: "bat" }` shows a +3 untyped Fly bonus with "Bat familiar" provenance in the skill panel; a toad familiar raises max HP by 3 with provenance (verify via fixtures).
- Bonded object with `bondedItemRef` set: the tooltip renders and the chosen gear item is flagged (v1: UI flag only — the engine doesn't enforce removing the bonded object, which is a play action).
- Persistence: reload page; the bond choice persists (additive optional field, no migration).
- Back-compat: an existing wizard doc with no `arcaneBond` produces byte-identical `compute()` output.
- Licensing: the new `familiars.ts` is authored from published PF1 rules; no Foundry source is transcribed (verify by the absence of any paste/clipboard evidence — the file should look like `tables.ts` / `feat-effects.ts`: hand-curated constants).

**Tests**:
- `packages/engine/test/familiars.test.ts` (new): hand-computed. bat → +3 Fly (`skill.fly`); cat → +3 Stealth (`skill.ste`); toad → max HP +3; rat → Fort save +2; weasel → Ref save +2. Choose a familiar whose kind isn't in the table → `compute()` returns the sheet unchanged (graceful soft-fail).
- `apps/web/test/doc.bond.test.ts` (new): `setArcaneBond` set/clear; familiar requires kind; blank-stripping; setting object with unknown gear-ref is accepted (soft warning only).
- Stacking fixture: wizard with cat familiar (+3 Stealth untyped) + a competence-typed Stealth item bonus → both apply and sum (untyped stacks with typed; verifies the familiar bonus routes through `stacking.ts` and shows provenance).
- Regression: an engine fixture without `arcaneBond` is byte-identical to before the change.

**Files touched**:
1. `packages/schema/src/character.ts` — `build.arcaneBond` + JSDoc.
2. `packages/engine/src/familiars.ts` — new, hand-authored.
3. `packages/engine/src/compute.ts` (or `collect.ts`) — apply familiar changes from `build.arcaneBond.familiarKind`.
4. `apps/web/src/model/doc.ts` — `setArcaneBond`.
5. `apps/web/src/components/builder/ArcaneBondPicker.tsx` — new.
6. `apps/web/src/components/builder/ClassesSection.tsx` — wire picker for wizards.
7. `apps/web/src/components/tracker/` — familiar/bonded-object surface + tooltip.
8. Two test files as above + one stacking fixture.

**Status**: Complete (2026-07-02). As-built notes:
- `bondedItemRef` (an `ItemInstance.id`) was impossible as planned — `ItemInstance` has no id field (gear is addressed by array index). Used the plan's own v1 fallback: free-text `bondedItemName`, stored raw when non-blank so a controlled input can carry mid-typing spaces.
- No separate tracker panel: the familiar's numeric provenance flows automatically through the sheet's skill/save/HP breakdowns (`"Bat (familiar)"` components), and `ArcaneBondPicker` itself carries the master-bonus summary, the hawk/owl conditional notes, and the bonded-object RAW text (1/day cast + DC 20 + spell level concentration). Alertness-while-adjacent is noted in the picker hint.
- Stacking fixture uses an active buff (competence Stealth) rather than an item, exercising the same collect→stack path.
- Verified end-to-end in the browser: bat Fly +0→+3, toad Max HP 6→9, rat Fort +0→+2, bonded-object name persists across reload (Dexie), re-clicking the active type chip clears the bond, no console/page errors.

---

## Stage 4 (deferred): Bloodline arcana/powers + school powers

**Goal**: Author the **passive abilities** that today are prose-only: a sorcerer's bloodline arcana (e.g. Draconic "+1 HP/HD", Fey "+2 vs enchantment) and bloodline powers (the named abilities unlocked at SL 1/3/9/15/20); a wizard's arcane school powers (diviner's foreknowledge, evoker's elemental damage, etc.). These are real but **not table-blocking** — a test session runs fine with bonus spells/slots + bloodline-tagged badge; missing the passive arcana shows up as HP being 1/HD too low, or a missing +2 vs. enchant, which a tester can hand-track until this stage lands.

**Why deferred**:
- Each bloodline (~40) and each school (8 + Universalist) needs its powers hand-authored clean-room from published PF1 rules (none are in the vendored Foundry content as structured data). That's ~50 small change-set entries with bespoke conditions (Draconic's "+1 HP/HD" needs a new `target`; Fey's "+2 vs enchantment" needs a bounded save-tag mechanism that doesn't exist yet).
- The bonuses route through the engine's change-application path (same path as `feat-effects.ts`), but several need new targets (`hd.bonus` for the +1 HP/HD; `saves.vs.<descriptor>` for descriptor-bounded saves) that aren't currently consumed in `compute.ts`.
- The UI work is small (render the auto-granted abilities in the build summary) but the data entry is the lion's share.

**Scope sketch** (not committing yet):
- New engine files `packages/engine/src/bloodlines.ts` + `packages/engine/src/schools.ts` mirroring `familiars.ts` / `feat-effects.ts` — each entry `{ id, name, levelUnlocked, changes: Change[], context?: ContextNote }`.
- Some entries need new engine targets: `hd.bonus` (+1 HP/HD), `saves.vs.enchantment` (+2 vs a descriptor). Adding new targets is a knock-on change to `compute.ts` — small, but each one needs a fixture. Evaluate whether to (a) add the targets, or (b) defer the abilities that need them and ship only the ones that fit existing targets (Draconic "+1/HD HP" is the most table-visible, since every sorcerer Draconic missing it has wrong max HP).
- UI: builder summary surfaces "Bloodline: Draconic — Arcana: +1 HP/HD, Powers: Claws (L1), Breath Weapon (L9, …)"; tracker renders them in the class-features panel.

**Decision deferred until Stages 1–3 land.** Reassess after the tester confirms which passive bonuses they actually miss in play — it may turn out only the +1 HP/HD (Draconic) and a couple of save bonuses are table-visible enough to justify the data-entry cost.

**Status**: Not Started (deferred per staging rationale above)

---

## Deferred items (carried forward from the previous plan)

- **Custom Powers** (build-time authored named abilities with typed `Change`s + resource pools, surfaced in play) — deferred per user from the GM Grants plan. Still deferred; no progress since.

### Same-vein gaps found while auditing this plan (2026-07-02) — NOT in scope here

A sweep of the other sliced classes for the same shape (choice-bearing, prose-only class features with no schema field) found two more, plus two non-gaps:

- **Barbarian rage powers** — `Rage Powers` class feature is prose-only (`changes: []`); no schema field for which powers were picked, no effects. Same treatment as this plan would apply: a named `build.ragePowers?: string[]` + hand-authored effects table. Deferred — reassess after Stages 1–3.
- **Rogue talents / advanced talents / master strike** — `Rogue Talents`, `Advanced Talents`, and `Master Strike` class features are prose-only (`changes: []`); no schema field for which talents were picked, no effects. Same treatment: a named `build.rogueTalents?: string[]` + hand-authored effects table. (Sneak Attack's dice progression is the one piece of Rogue that got hand-authored — `sneakAttackDice` in `packages/engine/src/tables.ts` — since it's unconditional and table-visible every session; talent selection is a separate, deferred concern.) Deferred — reassess after Stages 1–3.
- **Fighter weapon training group choices** — `Weapon Training` is prose-only; the group picks (L5/9/13/17) have no schema field. The engine already routes `attack.weapon.<group>` / `damage.weapon.<group>` targets (Weapon Focus uses them), so the effects path exists; only the choice field + change emission are missing. Deferred.
- *Non-gap*: **Armor Training** carries structured `changes` in the vendored data and already applies via the class-feature path. **Bravery** is prose-only but choice-free and situational (+1 Will vs fear per 4 levels) — context-note material at most.
- *Non-gap*: **Channel Energy** is already modeled (`tables.ts` `channelEnergyDetail` + resource pools).

---

## Verification posture (all stages)

`bun run typecheck` is the gate that must stay green. Engine tests are hand-computed fixtures per the convention (`packages/engine/test/`). Each stage adds at least: (a) a model-layer test for the new transition/logic, (b) a regression test asserting a doc without the new field produces byte-identical engine output, and (c) for engine-touching stages, a stacking/compute fixture verifying the new bonuses route through the change-application path correctly. Pipeline changes (Stage 1) regen data via `bun run data:build` and review the diff before committing.
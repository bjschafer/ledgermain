# Implementation Plan: Sorcerer bloodlines, wizard schools, arcane bonds

Three PF1e spellcaster class features are currently unimplemented (audit, 2026-07-01):

- **Sorcerer bloodlines** — no schema field, no engine logic, no UI. The _only_ surviving surface is bonus-feat **slot counting** (`apps/web/src/model/feats.ts` reads the `bonusFeats` change from the prose-only "Bloodline Feat (SOR)" class feature). The spell associations already exist in vendored data (`spells.json` carries `learnedAt.bloodline` for 39 bloodlines across 220 spells in the current slice) but the pipeline does **not** invert them.
- **Wizard specialization schools** — no schema field, no slot mechanic (specialist +1 school slot/level, opposition spells cost 2 slots), no UI. "Arcane School" is a prose-only `ClassFeature` (`changes: []`) for the _slot_ mechanic. [Corrected 2026-07-03: per-school **power** data (Hand of the Apprentice, Intense Spells, etc.) IS vendored, under `class-abilities/wizard-schools/*.yaml` — this claim was wrong. Implemented; see Stage 4 correction below.]
- **Arcane bonds** — no schema field, no familiar skill bonuses, no concentration-without-bonded-object penalty, no UI. "Arcane Bond" is prose-only. No familiar stat blocks are vendored anywhere.

The shared root cause: Foundry models each as a single prose-only `ClassFeature` with no structured sub-entries for the actual choices (which bloodline, which school, familiar vs. bonded object). The placeholder `build.classFeatureChoices: unknown[]` (`packages/schema/src/character.ts:65`) exists but is untyped, always `[]`, and read by no code. We will **not** use it — each feature gets a _named_ field, mirroring the working cleric-domain precedent (`build.clericDomains` + `refData.domainSpellLists` + `PreparedSpell.kind === "domain"`).

### Ordering / tractability

The three features differ sharply in how much vendored data we can lean on, which sets the staging:

| Feature                              | Vendored data we can lean on                                                                                                                                                                                                              | Hand-authoring burden                              |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Sorcerer bloodline **spells**        | ✅ `spells.json.learnedAt.bloodline` (39 bloodlines, 220 spells in the current slice — verified 2026-07-02; grows slightly once the keep-filter retains bloodline-only spells) — just needs a pipeline inversion mirroring the domain one | none                                               |
| Sorcerer bloodline **arcana/powers** | ❌ not vendored (prose-only feature)                                                                                                                                                                                                      | per-bloodline Change sets, clean-room              |
| Wizard school **slots/opposition**   | ❌ no `arcane-schools` pack read; only spell `school` tag (abj/evo/...)                                                                                                                                                                   | 8 school tags (trivial); school _powers_ are prose |
| Arcane bonds                         | ❌ no familiar stat blocks anywhere                                                                                                                                                                                                       | full familiar table, clean-room                    |

So: bloodline **spells** first (pure pipeline + schema + UI, mirrors domains exactly), then wizard **school slots** (schema + engine slot mechanic + UI; no new data needed), then **arcane bonds** (largest hand-authoring). Bloodline **arcana/powers** and school **powers** (the passive-ability effects) are deferred to a final stage — they're real but not table-blocking, and each school/bloodline has prose-only data we'd have to hand-transcribe clean-room.

> **Correction (2026-07-03)**: "school _powers_ are prose" (row 19) and "not vendored" (line 26, for schools) were wrong — see the Stage 4 correction note. Wizard school powers turned out to be structured `class-abilities/wizard-schools/*.yaml` data, not prose to hand-transcribe; same for cleric domain powers (not tracked in this table at all, since domains were already a "working precedent," but the same gap existed and is now closed). Bloodline arcana/powers (row 18) is unaffected by this correction — still genuinely prose-only.

### Licensing note (DESIGN §6)

Bloodline arcana/powers and familiar stat blocks are **not** in the vendored Foundry content and must be **hand-authored clean-room from the published PF1 rules**, never copied/transcribed from Foundry's GPL system code (the precedents are `packages/engine/src/tables.ts` and `packages/engine/src/feat-effects.ts`). Wizard school powers and cleric domain powers, by contrast, ARE vendored compendium _data_ (OGL / Paizo Community Use, same posture as feats/spells/classes elsewhere in this pipeline) — normalized directly, no hand-authoring or GPL-code involvement.

---

## Stage 1: Sorcerer bloodline spells (data + schema + UI)

**Goal**: Sorcerers pick a bloodline in the builder; bloodline bonus spells auto-populate the known list as the sorcerer levels (one per odd sorcerer level starting at 3), do **not** count against the spells-known cap, and render with a "bloodline" badge. Mirrors the cleric domain system end-to-end and is the template Stages 2–3 reuse.

**Scope** (in / out):

- IN: Pipeline inversion `learnedAt.bloodline` → `refData.bloodlineSpellLists` (mirror `normalize.ts:142-163` domain block exactly), emitted as `bloodline-spell-lists.json`. Extend the spell-slice keep filter (`normalize.ts:110-125`) so bloodline-only spells are retained (mirror the existing `hasDomain` term).
- IN: Schema `RefData.bloodlineSpellLists: Record<string, SpellList>` (mirror `refdata.ts:37`).
- IN: Schema `build.sorcererBloodline?: string` (mirror `build.clericDomains?: string[]` at `character.ts:57`).
- IN: Engine/Model: `bloodlineSpellsKnown(refData, bloodlineTag, sorcererLevel) -> string[]` in `apps/web/src/model/spellcasting.ts`. PF1 rule: a bloodline's level-`L` spell (1–9) is unlocked at sorcerer level `2L+1`. Returns spell ids the sorcerer has unlocked, sorted.
- IN: Builder UI: a `BloodlinePicker.tsx` rendered in `ClassesSection.tsx` for sorcerers (mirror `DomainPicker.tsx`). Dropdown of `Object.keys(refData.bloodlineSpellLists)`; chosen tag persisted via a `setSorcererBloodline` transition in `doc.ts` (mirror `setClericDomains` at `doc.ts:118`).
- IN: Known-list rendering (`SpellsSection.tsx` / wherever the sorcerer's known spells are listed): merge `bloodlineSpellsKnown` into the displayed known list with a "bloodline" badge; exclude them from the spells-known _cap_ check (they're bonus known, not chosen known).
- OUT: Bloodline **arcana** and **powers** (passive abilities like Draconic's breath weapon, +1 HP/HD from Fey, etc.) — deferred to Stage 4.
- OUT: Bloodline bonus **feat** selection — the _slot count_ is already correct (audit A6); picking _which_ bloodline feat fills the slot is a feat-picker concern that defers with Stage 4 (the feat list per bloodline isn't vendored).
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

**Engine changes** — none. `compute()` is unchanged; bloodline spells are a builder/tracker display concern (they expand the known list, not a derived stat). The engine's spells-known **table** (the cap) is untouched — bloodline spells are _bonus_ known and sit outside the cap, enforced at the UI layer. (Same posture as `gmGrants`, which lives entirely in the web model layer.)

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
): { id: string; name: string; level: number }[];
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

**Goal**: A wizard picks one specialization school (or "Universalist") and two opposition schools (none if Universalist). The specialist gets **one bonus prepared slot per spell level (1–9, not cantrips)** that must be filled from their school's spell list; opposition-school spells cost **two slots** to prepare. UI renders school slots next to the existing normal slots (mirroring the cleric domain slot rendering). School _powers_ — the passive arcane-school abilities (diviner's foresight, evoker's elemental damage, etc.) — were originally scoped as **deferred** to Stage 4, but **are now implemented** (2026-07-03) — see the Stage 4 correction note.

> **PF1 RAW check (corrected 2026-07-02)**: a Universalist gets **no** bonus slot and no opposition schools — their compensation is the Hand of the Apprentice / Metamagic Mastery school powers. Only specialists (the eight non-"uni" tags) get the +1 school slot per level. This simplifies the slot logic: `kind: "school"` slots exist only when `wizardSchool` is set and ≠ `"uni"`.

**Scope** (in / out):

- IN: Schema `build.wizardSchool?: string` (school tag: `"abj" | "con" | "div" | "enc" | "evo" | "ill" | "nec" | "trs" | "uni"`). Free-choice; no "oppose X requires school Y" validation (soft-warning posture).
- IN: Schema `build.wizardOppositionSchools?: string[]` (≤2 tags; empty/omitted for Universalist).
- IN: Schema: extend `PreparedSpell.kind` (`character.ts:222`) from `"normal" | "domain"` to `"normal" | "domain" | "school"`. `"school"` slots may only hold spells whose `spell.school` tag equals the wizard's specialization; one per accessible spell level (mirror domain slot exclusivity).
- IN: Model: opposition-preparation cost. A prepared spell with `spell.school ∈ oppositionSchools` consumes 2 normal slots of its level (PF1 RAW). Implemented in the prepare/spell-accounting model (`apps/web/src/model/` — wherever domain slot counting lives).
- IN: Builder UI: `SchoolPicker.tsx` (8 schools + Universalist); `OppositionPicker.tsx` (pick ≤2; disabled when Universalist). Wire in `ClassesSection.tsx` next to the sorcerer-bloodline branch from Stage 1.
- IN: Tracker UI: `PreparedSpellsPanel.tsx` renders one "school slot" per accessible spell level (when specialist), sourced from `refData.spellLists["wizard"]` filtered by `spell.school === wizardSchool'.
- OUT (at the time): School **powers** (arcane-school passive abilities), including the Universalist's Hand of the Apprentice / Metamagic Mastery. **Now implemented** (2026-07-03, see Stage 4 correction) — a Universalist still gets **no bonus slot** (see RAW check above), but does get its school powers, same as any specialist.
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

**Goal**: A wizard (or sorcerer with the Tattooed Sorcerer archetype — defer that interaction) records an arcane bond: a _familiar_ or a _bonded object_. Familiars grant their published master bonus (e.g. bat → +3 Fly, toad → +3 hit points). Bonded objects record the choice; their main RAW pain ("cast any spellbook spell 1/day"; "concentration DC 20 + spell level without the object") is surfaced as a play-tab tooltip, **not** modeled numerically in v1. Familiar stat blocks are hand-authored clean-room (none are vendored).

**Scope** (in / out):

- IN: Schema `build.arcaneBond?: { type: "familiar" | "object"; familiarKind?: string; bondedItemRef?: string }`. `familiarKind` keys into the hand-authored familiar table. `bondedItemRef` is an `ItemInstance.id` (player's own gear) for the bonded object; optional in v1 (player may record "bonded object" without specifying which item).
- IN: Hand-authored familiar table — new engine data file `packages/engine/src/familiars.ts` (mirrors the hand-authored shape of `tables.ts` / `feat-effects.ts`). The PF1 Core familiar list with each familiar's **master bonus** (corrected 2026-07-02 — the earlier draft listed 3.5e values; PF1 CRB values are): bat +3 Fly, cat +3 Stealth, lizard +3 Climb, monkey +3 Acrobatics, rat +2 Fortitude saves, raven +3 Appraise, viper +3 Bluff, toad +3 hit points, weasel +2 Reflex saves; hawk (+3 sight-based Perception in bright light) and owl (+3 sight-based Perception in shadows) are _conditional_ — model those two as a display note, not an always-on `Change`. Bonuses are expressed as `Change`s with engine target names (`skill.fly`, `skill.ste`, `skill.clm`, `skill.acr`, `skill.apr`, `skill.blf`, `fort`, `ref`, `hp` — all already-consumed targets, verified in `targets.ts`/`feat-effects.ts`) and type `"untyped"` (PF1 gives these bonuses no type; matches the `feat-effects.ts` precedent, e.g. Alertness). **Clean-room from published PF1 rules** (DESIGN §6) — never transcribe Foundry source.
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

## Stage 4 (partially done): Bloodline arcana/powers + school powers

**Goal**: Author the **passive abilities** that today are prose-only: a sorcerer's bloodline arcana (e.g. Draconic "+1 HP/HD", Fey "+2 vs enchantment) and bloodline powers (the named abilities unlocked at SL 1/3/9/15/20); a wizard's arcane school powers (diviner's foreknowledge, evoker's elemental damage, etc.); and — found in the same audit — a cleric's domain powers (Fire Domain's Fire Bolt/Fire Resistance, etc.), which this doc never separately called out as deferred.

> **Correction (2026-07-03)**: the premise "none are in the vendored Foundry content as structured data" below was **wrong** for wizard school powers and cleric domain powers — both live as fully structured `type: feat` entries under `class-abilities/wizard-schools/*.yaml` and `class-abilities/domains/*.yaml` respectively (name, description, level-gated `links.supplements`, `uses.maxFormula` for per-day powers), in the exact shape `transformClassFeature`/`transformClass` already handled for ordinary class features. **Implemented**: `packages/schema/src/refdata.ts` (`Domain`, `WizardSchool`, `RefData.domains`/`wizardSchools`), `packages/data-pipeline/src/transform/classes.ts` (`transformDomain`, `transformWizardSchool`, shared `resolveFeatureGrants`), `packages/engine/src/archetypes.ts` (`collectGrantedFeatures` — feeds both `resolveClassFeatures` display and `resources.ts`'s uses/day pools automatically), and the `DomainPicker`/`SchoolPicker`/`ClassFeaturesList` builder UI (origin-labeled entries, e.g. "Fire Bolt — Fire Domain"). Scope: top-level domains/schools only (35 domains, 9 schools) — subdomains and druid-domains are excluded (no structural link back to a parent domain in the source data), as are the elemental/focused-school variant rules.
>
> **Sorcerer bloodline arcana/powers remains genuinely unvendored** (prose-only) — the rest of this section's analysis still applies to that half only.

**Why still deferred (bloodline arcana/powers only)**:

- Each bloodline (~40) needs its arcana/powers hand-authored clean-room from published PF1 rules (not in the vendored Foundry content as structured data, unlike wizard schools/cleric domains above). That's dozens of small change-set entries with bespoke conditions (Draconic's "+1 HP/HD" needs a new `target`; Fey's "+2 vs enchantment" needs a bounded save-tag mechanism that doesn't exist yet).
- The bonuses route through the engine's change-application path (same path as `feat-effects.ts`), but several need new targets (`hd.bonus` for the +1 HP/HD; `saves.vs.<descriptor>` for descriptor-bounded saves) that aren't currently consumed in `compute.ts`.
- The UI work is small (render the auto-granted abilities in the build summary) but the data entry is the lion's share.

**Scope sketch** (not committing yet):

- New engine file `packages/engine/src/bloodlines.ts` mirroring `familiars.ts` / `feat-effects.ts` — each entry `{ id, name, levelUnlocked, changes: Change[], context?: ContextNote }`.
- Some entries need new engine targets: `hd.bonus` (+1 HP/HD), `saves.vs.enchantment` (+2 vs a descriptor). Adding new targets is a knock-on change to `compute.ts` — small, but each one needs a fixture. Evaluate whether to (a) add the targets, or (b) defer the abilities that need them and ship only the ones that fit existing targets (Draconic "+1/HD HP" is the most table-visible, since every sorcerer Draconic missing it has wrong max HP).
- UI: builder summary surfaces "Bloodline: Draconic — Arcana: +1 HP/HD, Powers: Claws (L1), Breath Weapon (L9, …)"; tracker renders them in the class-features panel (same `origin`-label pattern now used for domain/school powers).

**Decision deferred.** Reassess after the tester confirms which passive bonuses they actually miss in play — it may turn out only the +1 HP/HD (Draconic) and a couple of save bonuses are table-visible enough to justify the data-entry cost.

**Status**: Wizard school powers + cleric domain powers **Done** (2026-07-03). Sorcerer bloodline arcana/powers: Not Started (deferred per staging rationale above — genuinely hand-authoring, unlike the other two).

---

## Deferred items (carried forward from the previous plan)

- **Custom Powers** (build-time authored named abilities with typed `Change`s + resource pools, surfaced in play) — deferred per user from the GM Grants plan. Still deferred; no progress since.

### Same-vein gaps found while auditing this plan (2026-07-02) — NOT in scope here

A sweep of the other sliced classes for the same shape (choice-bearing, prose-only class features with no schema field) found two more, plus two non-gaps:

- **Barbarian rage powers** — `Rage Powers` class feature is prose-only (`changes: []`); no schema field for which powers were picked, no effects. Same treatment as this plan would apply: a named `build.ragePowers?: string[]` + hand-authored effects table. Deferred — reassess after Stages 1–3.
- **Rogue talents / advanced talents / master strike** — `Rogue Talents`, `Advanced Talents`, and `Master Strike` class features are prose-only (`changes: []`); no schema field for which talents were picked, no effects. Same treatment: a named `build.rogueTalents?: string[]` + hand-authored effects table. (Sneak Attack's dice progression is the one piece of Rogue that got hand-authored — `sneakAttackDice` in `packages/engine/src/tables.ts` — since it's unconditional and table-visible every session; talent selection is a separate, deferred concern.) Deferred — reassess after Stages 1–3.
- **Fighter weapon training group choices** — `Weapon Training` is prose-only; the group picks (L5/9/13/17) have no schema field. The engine already routes `attack.weapon.<group>` / `damage.weapon.<group>` targets (Weapon Focus uses them), so the effects path exists; only the choice field + change emission are missing. Deferred.
- _Non-gap_: **Armor Training** carries structured `changes` in the vendored data and already applies via the class-feature path. **Bravery** is prose-only but choice-free and situational (+1 Will vs fear per 4 levels) — context-note material at most.
- _Non-gap_: **Channel Energy** is already modeled (`tables.ts` `channelEnergyDetail` + resource pools).

### Paladin/Ranger mechanical audit (issue #13 step 2, 2026-07-02)

Following the same treatment as Rogue's step 2 (`sneakAttackDice`): Smite Evil's attack/damage/AC scaling is hand-authored clean-room (`smiteEvilDetail` in `packages/engine/src/tables.ts`, wired into `resolveClassFeatures`'s `detail` field) since it's unconditional and table-visible every session it's active. Lay on Hands' healing dice similarly got a small hand-authored `layOnHandsDice` wired into `resources.ts`'s tag-gated detail (mirroring `channelEnergy`'s special case — Lay on Hands does carry a real `tag: "layOnHands"` upstream, so no new machinery was needed). Divine Grace and both classes' `uses.maxFormula` resource pools (Smite Evil uses/day, Lay on Hands uses/day) already worked for free via the generic changes-formula/resource pipeline, confirmed by fixture tests rather than assumed. Ranger's Combat Style Feat _bonus feat count_ (`floor((@class.unlevel + 2) / 4)` targeting `bonusFeats`) also already flows through the generic `classBonusFeats` pipeline in `apps/web/src/model/feats.ts` with no changes.

**Built (2026-07-03), the "situational bundle":** Favored Enemy, Favored Terrain, and Combat Style _feat choice_ are now implemented. Because none of these bonuses are always-on (they apply only vs. a specific creature type / in a specific terrain — the player judges at the table), they surface through the **saved-roll attachment path** rather than the always-on derived sheet, extending the same mechanism as the situational-feat attachments (`SITUATIONAL_FEAT_EFFECTS`). Shape:

- Rules tables + level→slot/budget math are hand-authored clean-room in `packages/engine/src/ranger.ts` (`FAVORED_ENEMY_TYPES`, `FAVORED_TERRAIN_TYPES`, `COMBAT_STYLES` — the two CRB styles plus the five from Ultimate Combat (Crossbow, Mounted Combat, Natural Weapon, Two-Handed Weapon, Weapon and Shield), each with its per-style feat tree (all 51 tree slugs verified to resolve to vendored feats); `favoredEnemySlots`/`favoredTerrainSlots`/`favoredBonusBudget`; `computeRanger` → `DerivedSheet.ranger`). Bonuses are _player-assigned per pick_ (`build.favoredEnemies`/`favoredTerrains` = `{type, bonus}[]`) because the RAW distribution (add a new type at +2 AND raise one existing by +2 at each milestone) is a choice, not derivable from level — the picker soft-validates against the budget but never hard-blocks.
- **Favored Enemy / Favored Terrain** attach to a saved roll (`SavedRoll.rangerBonuses`, resolved live from `sheet.ranger` in `apps/web/src/model/savedRolls.ts` — favored enemy folds attack+damage, terrain folds the roll total; a since-removed pick degrades to a reminder chip). Builder UI: `RangerPicker.tsx`.
- **Combat Style feat choice** (`build.combatStyle`) waives the _hard_ prereq block for that style's feat tree (`prereqs.ts` `bypassBlockedSlugs`, fed by `model/ranger.combatStyleFeatSlugs`; the feat picker shows a "⚑ combat style" note). The bonus-feat _count_ already worked (see above).

Still deferred:

- **Divine Bond** (paladin) — weapon bond (temporary weapon enhancement bonus) or mount (special mount table, similar shape to the druid animal companion / summoner eidolon systems this project hasn't built). Deferred.
- **Mercy** (paladin) — Lay on Hands additionally cures a condition per mercy known, scaling in number with level. Would need `build.paladinMercies?: string[]` + a condition-cure effects table. Deferred.
- **Hunter's Bond** (ranger) — companion or party attack-bonus-sharing ability; overlaps with the deferred animal-companion system. Deferred.
- _Non-gap_: **Divine Grace** already applies via the generic `changes[]` pipeline (`@abilities.cha.mod` → `allSavingThrows`, untyped) — no hand-authoring needed.
- _Non-gap (documented gap, not built)_: **Track** (ranger) carries a vendored `contextNotes[]` entry (`+max(1, floor(@class.unlevel/2))` to Survival checks to follow tracks) but this engine's `contextNotes` support (`packages/engine/src/conditions.ts`) is a separate, hand-authored condition mechanism — it does NOT consume RefData's vendored `contextNotes` from class features/items/races (`ClassFeature` in `packages/schema/src/refdata.ts` has no `contextNotes` field at all; the data-pipeline transform never captures it for class-abilities). Wiring vendored `contextNotes` generically would be new engine machinery, out of scope for this step. Track's skill bonus is therefore not modeled; a player must apply it manually.

### Monk mechanical audit (issue #13 step 1, 2026-07-02)

Only the core `monk` class is vendored (tag `monk`); `monk-unchained` (the optional-rules variant, tag `monkUnchained`) is intentionally skipped, same posture as skipping antipaladin when paladin was added. BAB/saves/HP/skills work off the vendored class def as usual (non-caster, no spellcasting block needed). Most of monk's numeric class features already flow through the existing generic pipelines with no hand-authoring, confirmed by fixture tests rather than assumed: Bonus Feat (Monk)'s count (`classBonusFeats`), Fast Movement's land-speed bonus (`applySpeedTarget`/`landSpeed`), and both Ki Pool's and Stunning Fist's `uses.maxFormula` resource pools (`deriveResourcePools`).

**Step 2 (2026-07-02)** followed the same treatment as Rogue's step 2: Unarmed Strike's damage die is hand-authored clean-room from the SRD's "Table: Monk Unarmed Damage" (Medium column only — `unarmedDamageDie` in `packages/engine/src/tables.ts`, wired into `resolveClassFeatures`'s `detail` field, matched by `cls.tag === "monk" && grant.name === "Unarmed Strike"`), since the vendored feature's own dice-bearing action formula (`sizeRoll(...)`) is out of scope for this engine's non-numeric-dice-eval formula DSL. Flurry of Blows got a similarly hand-authored, display-only `flurryOfBlowsLabel` summarizing total flurry attack count and the flat -2/monk-level-as-BAB mechanic — deliberately NOT wired into the live attacks/iteratives table (that would need a general "alternate full-attack routine at reduced effective BAB" mechanism benefiting every future full-BAB martial class, out of scope for monk alone). Also fixed the Unarmed Strike bonus-feat mis-attribution documented below.

Four real gaps/quirks were found during the step 1 audit:

- **~~Maneuver Training's CMB correction was inflated~~ — fixed.** Its vendored formula (`@class.unlevel - @attributes.bab.total`, untyped, target `cmb`) swaps medium-BAB CMB for full-monk-level CMB. `packages/engine/src/rolldata.ts`'s `buildRollData` didn't populate an `attributes.bab` path at all, and `collectModifiers()` ran _before_ `compute()` derived `bab` as a local variable — so `@attributes.bab.total` always resolved to the formula DSL's missing-path default of `0`. Fixed by hoisting the BAB-from-class-levels computation (it only depends on `doc.identity.classes`, not on any collected modifier) above roll-data construction in `compute()` and threading it through `buildRollData(..., bab)` into `attributes.bab.total`. See the fixture test in `packages/engine/test/compute.test.ts` for the corrected numeric example.
- **AC Bonus (Wis-to-AC) only correctly gates on armor** (shield/encumbrance are out of scope — see below), and no longer double-counts in CMD. Its vendored formula checks three conditions (`lt(@shield.type, 1)`, `lt(@armor.type, 1)`, `lt(@attributes.encumbrance.level, 1)`) before applying `wisMod + floor(unlevel/4)` to both `ac` and `cmd`. `@armor.type` is correctly populated by `rolldata.ts` from equipped gear, so the "not wearing armor" case works. `@shield.type` is never populated anywhere in `rolldata.ts` (missing path → `0`, i.e. always reads as "no shield"), and `@attributes.encumbrance.level` is hardcoded to `0` (no encumbrance model yet — issue #16's territory). So a monk wielding a shield or carrying a heavy load incorrectly still receives the bonus; building shield-slot tracking or encumbrance is out of scope here. **Issue #33 (fixed):** CMD used to double-count whenever a source carried both a generic `ac`-target change and its own explicit `cmd`-target change with the identical formula — the same untyped "generic"-category change fed `cmd` once via `computeAc`'s old `cmdAcBonus` (derived from any `dodge`/`deflection`/`generic` `ac.components`, an overly broad category bucket) and again via the explicit `cmd` change. This hit monk's AC Bonus, Iron Mask (both masterwork and common), and the Deflection Aura buff. Fixed in `compute.ts`'s CMB/CMD block: CMD's AC-sourced contribution is now derived by bonus **type** (RAW's eight named types — `deflection`/`dodge`/`circumstance`/`insight`/`luck`/`morale`/`profane`/`sacred`, via the `CMD_AC_TYPES` set) directly from the same `collected` "ac"-target modifiers `computeAc` reads, rather than from the AC category bucket; untyped/enhancement/racial/etc. AC bonuses are excluded from auto-derivation entirely (armor/shield/natural already were, since those live under separate `aac`/`sac`/`nac` targets). When a source has both an auto-eligible `ac` change and its own explicit `cmd` change, the `ac` copy is excluded by `sourceId`/`source` dedup, and the two pools are stacked together in one `resolveStack` pass so cross-pool same-type competition (e.g. an explicit cmd deflection bonus vs. a separate deflection ring) still resolves to the highest per type. See the "compute: CMD RAW-correct derivation, no double-counting (issue #33)" fixture block in `compute.test.ts` (Iron Mask, Deflection Aura, a plain-deflection auto-derive case, a dodge auto-derive case, an armor-exclusion case, and a two-deflection-sources stacking case), plus the updated monk AC-bonus test. Neither `cmb` nor `cmd` carries a provenance/components array on `DerivedSheet` (unlike `ac.components`), so the deduped auto-derivation has nothing to mark `applied: false` on — it's simply absent from the sum. Flat-footed CMD (losing Dex/dodge) was left out of scope, since it didn't fall out of this fix trivially and no vendored data exercises it yet.
- **Diamond Soul's Spell Resistance change has nowhere to land.** Its vendored formula (`10 + @class.unlevel`, target `spellResist`) is correctly formed, but Spell Resistance isn't a tracked stat anywhere in `DerivedSheet` or consumed as a `compute.ts` target — this app doesn't model SR at all yet. Not built here; would need a new `spellResist` field + compute wiring if ever prioritized.
- **~~Unarmed Strike's vendored `bonusFeats` change is mis-attributed~~ — fixed.** Its `changes[]` entry (flat `"1"`, target `bonusFeats`) represents the automatic Improved Unarmed Strike grant every monk gets at L1, but `classBonusFeats()`'s fixed-grant filter only skipped a class feature when its _name_ matched a real feat's name exactly (`"Unarmed Strike"` != `"Improved Unarmed Strike"`), so it wasn't recognized as an auto-granted feat and instead inflated `expectedFeatCount`'s free bonus-feat-slot budget by +1 at every monk level. Fixed in `apps/web/src/model/feats.ts` by adding a small `FEATURE_NAME_OVERRIDES` map (feature name -> the feat name it actually grants, currently just `"unarmed strike" -> "improved unarmed strike"`) consulted by both `grantedFeats()` and `classBonusFeats()` before their by-name lookups, rather than generic UUID-based feat-grant resolution (bigger, more invasive data-pipeline change, out of scope). See `apps/web/test/feats.test.ts`'s Monk Unarmed Strike block for the corrected numeric example and the assertion that "Improved Unarmed Strike" now surfaces via `grantedFeats()`.
- _Non-gap_: **Still Mind**'s vendored `contextNotes` entry is unconsumed — same shape and same non-gap as ranger Track above (`ClassFeature` has no `contextNotes` field at all).

### Druid mechanical audit (issue #13 step 2, 2026-07-03)

Cheaper than expected, same shape as bard: adding the class tag (`SLICE.classTags` + `CLASS_ARCHETYPE_FILES["druid"] = "Druid.csv"`) and regenerating data was step 1. Auditing all 15 of druid's vendored class features found every one of them prose-only (`changes: []`) except two, both of which already work through existing generic pipelines with zero hand-authoring, confirmed by fixture tests rather than assumed:

- **Nature Sense** carries real vendored `changes[]` (`+2` untyped to both `skill.sur` and `skill.kna`, specific skill ids — not the `skill.knowledge` compound-group alias bard needed) — already applies via the generic change-application path.
- **Wild Shape** carries a real vendored `uses.maxFormula` (`min(floor((@class.unlevel - 2) / 2), 8)`) — already becomes a resource pool via `deriveResourcePools`, same as Rage/Ki Pool/Bardic Performance. Its `detail` field is intentionally left `undefined`: unlike Smite Evil/Lay on Hands, Wild Shape's actual effect (turning into an arbitrary animal/elemental/plant statblock) has no bounded numeric summary to derive — the use-count is trackable, the transformation itself is not modeled.

Spellcasting: Druid is a Wisdom-based full prepared-divine caster whose spells-per-day table is numerically identical to Cleric's (itself an alias of the wizard table) — added as `DRUID_SPELLS_PER_DAY = WIZARD_SPELLS_PER_DAY` in `packages/engine/src/tables.ts` and a `druid` entry in `apps/web/src/model/spellcasting.ts`'s `CASTER_MODELS` (`preparesFromClassList: true`, `grantsAllCantrips: true`, no domain-style bonus slots). `spellListClassTags` picked up `"druid"` so `refData.spellLists.druid` inverts from vendored `learnedAt.class` the same way cleric's does.

Deferred, same posture as Rogue Talents / Barbarian Rage Powers (prose-only, choice-bearing, no vendored numeric formula):

- **Nature Bond** — choice of an animal companion (needs the not-yet-built animal-companion system, same gap as paladin's Divine Bond mount option) or a cleric-style domain (would need its own choice field: the app's existing `DomainPicker`/`build.clericDomains` is hardcoded to cleric's "pick two domains" behavior — Nature Bond grants only one, and its domain spell list would need a similar bonus-prepare-slot treatment). Deferred.
- **Wild Empathy** — a `1d20 + druid level + Cha modifier` check, structurally like a skill check but with no vendored `uses.maxFormula` (it's an at-will re-triable check, not a limited resource) and no existing "special check" display surface in the tracker (unlike Smite Evil/Lay on Hands, which hook into the resource-pool `detail` line). Would need a new UI concept, not just a hand-authored formula. Deferred; the ability's text renders as-is via `ClassFeaturesList.tsx`.
- _Non-gap_: **Spontaneous Casting (DRU)** (swap a prepared spell for Summon Nature's Ally) is prose-only and unmodeled, but this is consistent with the app never having modeled Cleric's parallel spontaneous cure/inflict casting either — not a druid-specific gap.
- _Non-gap_: **Chaotic/Evil/Good/Lawful Spells** (alignment-gated spell-list restriction) has no numeric content to hand-author; it's a restriction on which spells may be prepared, not a bonus.

### Arcanist mechanical audit + hybrid casting (issue #13/#35 follow-through, 2026-07-04)

Adding the class tag (`SLICE.classTags` + `spellListClassTags` + `CLASS_ARCHETYPE_FILES["arcanist"] = "Arcanist.csv"`, 11 archetypes ingested) and regenerating data was step 1, same as every prior class. The class def resolves 8 linked class features: Arcane Reservoir, Arcanist Exploits, Arcanist Spells, Cantrips, Consume Spells, Spellbooks (ARC), Greater Exploits, and Magical Supremacy (L20 capstone).

**Arcanist is the first genuinely HYBRID caster modeled** (ACG): she prepares a limited number of spells from an unbounded, wizard-shaped spellbook each day (the "Spells Prepared" table), then casts spontaneously from among those prepared spells by spending a per-level slot from a separate, sorcerer-shaped daily pool (the "Spells per Day" table) — casting never expends the specific prepared spell, only a slot. This needed a third table shape the engine didn't have yet:

- `packages/engine/src/tables.ts`: `ARCANIST_SPELLS_PER_DAY` (the cast-slot pool; column 0/cantrips always `null` — the ACG table has no 0-level column) and `ARCANIST_SPELLS_PREPARED` (the wizard-shaped daily readying cap, columns 0–9; NOT adjusted by ability score, same posture as the sorcerer/bard spells-KNOWN tables) plus a new `baseSpellsPrepared()` function/`SpellPreparedProgression` type, parallel to `baseSpellsKnown()`/`SpellKnownProgression` but semantically distinct — arcanist's spellbook is unbounded (wizard-style), only the daily-prepared SUBSET is capped, unlike a sorcerer's permanently-capped known list. Both tables cross-checked against aonprd.com and the legacy PRD mirror (two independent sources, exact match) — sanity anchor at L4: 4/2 first/second-level slots per day (6/3 with Int 20's bonus slots), 3/1 first/second-level spells prepared plus 6 cantrips prepared, matching the owner's Hero Lab sheet.
- `apps/web/src/model/spellcasting.ts`: `CasterModel.preparation` gained a third value, `"hybrid"`, plus an optional `preparedProgression` field (read by the new `preparedCapacityByLevel()` helper, mirroring `spellsKnownLimitsByLevel()`'s shape but never ability-adjusted). The `arcanist` `CASTER_MODELS` entry: `ability: "int"`, `progression: "arcanist"` (cast slots), `preparedProgression: "arcanist"` (prepare cap), `grantsAllCantrips: true` (same simplification already applied to wizard/cleric/druid — cantrips are capped by the prepared table's column 0 but treated as cast-at-will once readied, rather than modeling the RAW "prepared but not expended" nuance as a literal unlimited-cast toggle), `preparesFromClassList: false` (has its own curated spellbook, exactly like wizard). Because `preparesFromClassList` and `knownProgression` are both unset/false for arcanist, the BUILDER's `SpellsSection.tsx` needed **zero changes** — it already treats arcanist's spellbook exactly like a wizard's (unbounded add/remove, no known-limit advisory, since `isSpontaneous` checks `=== "spontaneous"` strictly and arcanist is `"hybrid"`).
- `apps/web/src/components/tracker/PreparedSpellsPanel.tsx`: new `HybridView`, recombining pieces of `PreparedView` and `SpontaneousView` rather than inventing new model machinery — a **Prepare** section (readies spells from the spellbook into `live.spells.prepared`, capacity from `preparedCapacityByLevel`, reusing `prepareSpell`/`unprepareSpell`/`removePreparedAt`/`clearPrepared` from `preparedSpells.ts` unchanged) feeds a separate **Cast** section (spends a slot from `spellSlotsByLevel`/`progression`, reusing `castSpontaneousSlot`/`restoreSpontaneousSlot`/`spontaneousSlotStatus`/`resetSpontaneousSlots` from `spontaneousSpells.ts` unchanged) that offers whatever is currently prepared at that level. Unlike `PreparedView`, prepared rows here have no per-instance Cast/Recover — casting only ever touches the shared slot pool, never marks a specific instance `expended`. `model/rest.ts`'s `restNewDay()` needed **zero changes**: it already calls both `restPreparedSpells` (a no-op for arcanist, since nothing is ever expended) and `resetSpontaneousSlots` for every caster class on the document.
- `packages/schema/src/character.ts` was **not touched** — the hybrid model needed no new document fields, only new interpretation of the existing `live.spells.prepared` + `live.spells.slotsUsed(ByClass)` shapes already built for wizard/sorcerer.

**Deferred, same posture as Rogue Talents / Barbarian Rage Powers** (prose-only, choice-bearing, no vendored numeric formula — no schema field, no picker):

- **Arcanist Exploits** (chosen at L1 and every 2 levels thereafter) and **Greater Exploits** (L11+) — the exploit list itself (Potent Magic, Quick Study, Dimensional Slide, etc.) isn't even linked via the class's `links.supplements` (only the "Arcanist Exploits"/"Greater Exploits" class-feature stubs are); each exploit is its own standalone `class-abilities` entry (e.g. `potent-magic.ByZBsqXi9uhbPSJn.yaml`, `quick-study-arc.bQIHXFmVTfQv6rD3.yaml`) with no vendored linkage back to the class at all. Building a picker would need a hand-curated exploit list (there is no data-driven way to enumerate "the arcanist exploit options"), same shape of effort as Rogue Talents. Deferred.
- **Consume Spells** and **Quick Study**'s move-action/full-round-action spell-slot-for-reservoir-point (and vice versa) exchange mechanics are not modeled beyond their `uses.maxFormula` resource pool (Consume Spells' use-count, `@abilities.cha.mod` — confirmed via fixture test) — the actual exchange (spend a prepared slot to gain a reservoir point, or spend a reservoir point to swap a prepared spell) is a table-adjudicated action this app doesn't walk the player through, same posture as Smite Evil/Lay on Hands not walking through their attack rolls.
- **Arcane Reservoir RAW nuance not modeled**: the pool's cap (`3 + arcanist level`, vendored `uses.maxFormula: "3 + @class.unlevel"`, confirmed 7 at L4 via fixture test) already rides the generic `deriveResourcePools` pipeline for free. The RAW _daily refill_ amount is actually smaller — `3 + floor(level / 2)` (present in the raw Foundry YAML as `system.uses.rechargeFormula`, e.g. 5 at L4, not the full 7 — "any points she had from the previous day are lost" before refilling) — but `normalizeUses()` in `packages/data-pipeline/src/transform/common.ts` only ever extracts `maxFormula`/`per`, so `rechargeFormula` isn't even in our vendored `ClassFeature.uses` shape today, for any class. This engine's generic resource-pool model also has no separate refill-vs-cap distinction (every other resource pool in this app refills to its cap on rest, e.g. Rage/Ki Pool/Bardic Performance), so v1 treats Arcane Reservoir as refilling to its full cap each day like every other pool — a minor RAW deviation (over-refills by `ceil(level/2)`, i.e. +2 at L4) rather than a missing feature. Flagged here rather than silently accepted; revisit only if a future class needs `rechargeFormula` badly enough to justify capturing it in the pipeline and adding refill-vs-cap machinery to `deriveResourcePools`.

### Archetype numeric effects, round 2 — top ~20 by play popularity (2026-07-05)

Extends the issue #7 `ARCHETYPE_FEATURE_EFFECTS` table (`packages/engine/src/archetype-effects.ts`) from its original 6-archetype slice (Weapon Master, Invulnerable Rager, Savage Barbarian, Wildborn, Cloistered Cleric, and the 6 ranger Combat Style reflavors — Bow Nomad/Horse Lord/Ilsurian Archer/Shapeshifter/Stormwalker/Toxophilite, counted individually below) to a hand-picked ~20-most-played slice across all 12 currently-supported classes (fighter, barbarian, rogue, ranger, paladin, monk, bard, cleric, druid, wizard, sorcerer, arcanist — magus/oracle and animal companions were being added by parallel agents and are deliberately untouched here). Selection method: enumerated every archetype actually vendored per class from `packages/data-pipeline/data/archetypes.json` first (the task's assumed candidates — Zen Archer, Qinggong Monk, Crossblooded/Wildblooded Sorcerer — turned out **not to be in the vendored third-party CSV compilation at all**, confirmed by grep; picked real substitutes from what's actually there instead), then picked by real-world popularity + whether the archetype's OWN replacement feature (not just what it swaps out) has a genuinely unconditional, Change-shaped number.

This is the hand-authored seed for issue #45 (future batch-extraction pipeline) — the audit notes below (which vendored features were checked and why they were/weren't modeled) are exactly the kind of judgment call a future extraction script would need a human-reviewed example set for.

**Real numbers added** (6 new entries, on top of the 11 pre-existing archetype ids):

- **Archer** (fighter) — Hawkeye: `+1` Perception at 2nd, `+1`/4 levels thereafter (`skill.per`), replacing Bravery (which carries no vendored number anyway). The companion "+5 ft. bow range increment" half of the same ability is NOT modeled — there's no engine target for a weapon's range increment at all (attack rolls don't model range), so only the modelable half is added rather than guessing at the other.
- **Crusader** (cleric) — Bonus Feat: a restricted-list bonus feat at 1st, 5th, and every 5 levels thereafter (`1 + floor(level/5)`, target `bonusFeats`, same reflavor pattern the 6 ranger Combat Style archetypes already established). Flagged in-code: the vendored prose's "maximum of six at 20th level" doesn't reconcile with its own enumerated schedule (which yields five) — modeled as five, discrepancy noted rather than silently "fixed" by inventing a sixth gate.
- **Sorcerer of Sleep** (sorcerer) — Pesh Expert: flat `+1/2 level` (min 1), untrained, on four named skills (Appraise, Craft (alchemy), Heal, Knowledge (local)) — same shape as Cloistered Cleric's Breadth of Knowledge. **Known composition gap** (pre-existing, not introduced here): this replaces "bloodline arcana," which isn't a normal `RefData.classFeatures` entry (it's hand-authored in `bloodlines.ts`, applied by a dedicated `collect.ts` loop with no archetype-swap awareness at all) — so a Sorcerer of Sleep with a bloodline picked still gets both this bonus AND their bloodline arcana. The vendored data can't pair this swap (no `pairedBaseFeatureUuid`), so the UI's existing "may replace an existing ability" ambiguous-swap warning already surfaces it to the player; not fixed here (would mean adding bloodline-arcana-aware suppression logic to `collect.ts`, out of scope for a merge-friendly, append-only pass with two other agents touching adjacent files).
- **Seeker** (sorcerer) — Tinkering: flat `+1/2 level` (min 1) on Disable Device (the ability's Perception-to-locate-traps half is scoped/conditional and left unmodeled, same bar as everywhere else in this file).
- **Nornkith** (monk) — Nimble Reflexes: flat `+2` Reflex saves at 3rd level, replacing Still Mind (no vendored number to suppress).

**Notes-only, audited and confirmed non-modelable** (documented here rather than in code — `ClassFeaturesList` already renders each archetype feature's full vendored prose description regardless of whether it has a table entry, so a notes-only archetype doesn't strictly need a code entry to be useful to a player; several were still given a `changes: []` + `detail` table entry anyway, purely to surface a terse scaling-number summary next to the prose — `archetypeHasModeledEffects` was tightened to require `changes.length > 0` so these don't falsely earn the picker's "M" badge):

- **Urban Barbarian** (barbarian) — Controlled Rage reflavors rage's ability bonuses, but the engine doesn't apply rage's baseline ability bonuses automatically at all today (rage's Str/Con bump is left to a manual player-added buff, same posture this file already takes for ki/grit/panache) — nothing to override.
- **Two-Handed Fighter** (fighter) — Overhand Chop (double Str bonus on one chosen 2H attack/charge) is per-attack situational, same bar as Power Attack/Deadly Aim's situational-only treatment in `feat-effects.ts`.
- **Scout** (rogue) — Scout's Charge / Skirmisher (sneak attack on a charge / on a move-then-attack) are conditional on the specific action taken that round.
- **Knife Master** (rogue) — Hidden Blade/Sneak Stab/Blade Sense are all scoped to a specific weapon category (and Blade Sense specifically depends on the ATTACKER's weapon, which the static sheet can't know).
- **Oath of Vengeance** (paladin) — Channel Wrath is a resource conversion (spend lay-on-hands for an extra smite), not a flat number.
- **Divine Hunter** (paladin) — Precise Shot as a bonus feat has no baseline static number of its own (see `feat-effects.ts`'s situational treatment of Precise Shot); its later features are all conditional ally auras.
- **Archaeologist** (bard) — Archaeologist's Luck is a REAL, precisely-scaling number (+1/+2/+3/+4 luck at 1st/5th/11th/17th) but it's an activated, swift-action, bardic-performance-style buff — and the engine has **no generic "activated performance buff" mechanism at all yet** (checked: base bardic performance today is only a rounds/day resource pool in `resources.ts`, with no toggle applying Inspire Courage's or anything else's numeric benefit while active). Recorded here as the concrete motivating example for that future feature rather than inventing bespoke one-off engine machinery for a single archetype.
- **Menhir Savant** (druid) — entirely activated/resource-gated (detection, per-use caster-level bumps, limited-use spell-likes).
- **Spell Sage** (wizard) — Focused Spells / Spell Study are both activated, resource-gated abilities (spend a daily use to spike caster level or borrow another class's spell) with no passive baseline number.
- **School Savant** (arcanist) — audited all 11 vendored arcanist archetypes; every one reworks the arcane reservoir/exploit/spells-known subsystems rather than granting a flat number. School Savant (the most-played, a direct analogue of the wizard arcane school) is the representative entry: correctly modeling it would mean wiring a whole new cross-class feature-grant path (mirroring `collectGrantedFeatures`'s domain/school handling) to let an arcanist inherit a wizard school's powers — out of scope for a table-entry pass.

**Composition with `activeArchetypeSwaps`**: every new real-number entry either (a) has a clean 1:1 paired swap the existing machinery already suppresses correctly (Archer/Hawkeye replacing Bravery), or (b) is a pure additive grant with no base-feature slot to suppress (Crusader's Bonus Feat, Sorcerer of Sleep's Pesh Expert, Seeker's Tinkering — none of these have a `pairedBaseFeatureUuid`, so there's no suppression to get right), or (c) is an ambiguous/unpaired swap already surfaced to the player via the existing "may replace an existing ability" warning (Nornkith's Nimble Reflexes vs. Still Mind — Still Mind has no vendored number anyway, so no leak). No changes were needed to `activeArchetypeSwaps` or `collect.ts`'s suppression logic itself; the new test suite adds one more concrete regression case (Archer/Bravery) alongside the three pre-existing ones (Two-Handed Fighter/Armor Training, Weapon Master/Armor Training, Wildborn/Damage Reduction).

**Existing-code finding, not fixed here**: monk's Maneuver Master (Ironskin Monk) archetype was investigated and deliberately DROPPED from this pass — its "Iron Skin" (natural armor) and "Tough as Nails" (DR) features both replace monk class features that carry REAL vendored `Change`s (`AC Bonus (MNK)`'s Wis-to-AC formula, and Fast Movement's `landSpeed` bonus) via ambiguous/unpaired swaps (no `pairedBaseFeatureUuid`). Unlike the Sorcerer of Sleep gap above (a hand-authored bloodline power the swap machinery was never built to reach), this is the SAME category of bug `archetypes.ts`'s `AMBIGUOUS_DR_REPLACEMENTS`/`barbarianDamageReductionReplaced` was hand-built to fix for barbarian DR — it would need an equivalent hand-maintained exclusion mechanism for monk AC/speed, which is real engine work beyond a table entry. Flagged for a future pass rather than silently shipping a double-counted AC/speed bonus.

**Full ~20 list** (11 pre-existing + 6 new-with-numbers + 9 new-notes-only = 26 archetypes total now have a table entry or an audited note, spanning all 12 classes): Weapon Master, Two-Handed Fighter, Archer (fighter) · Invulnerable Rager, Savage Barbarian, Wildborn, Urban Barbarian (barbarian) · Scout, Knife Master (rogue) · Bow Nomad, Horse Lord, Ilsurian Archer, Shapeshifter, Stormwalker, Toxophilite (ranger) · Oath of Vengeance, Divine Hunter (paladin) · Nornkith (monk) · Archaeologist (bard) · Cloistered Cleric, Crusader (cleric) · Menhir Savant (druid) · Spell Sage (wizard) · Sorcerer of Sleep, Seeker (sorcerer) · School Savant (arcanist).

---

## Verification posture (all stages)

`bun run typecheck` is the gate that must stay green. Engine tests are hand-computed fixtures per the convention (`packages/engine/test/`). Each stage adds at least: (a) a model-layer test for the new transition/logic, (b) a regression test asserting a doc without the new field produces byte-identical engine output, and (c) for engine-touching stages, a stacking/compute fixture verifying the new bonuses route through the change-application path correctly. Pipeline changes (Stage 1) regen data via `bun run data:build` and review the diff before committing.

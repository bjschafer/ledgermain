# Implementation Plan: GM Grants (skill ranks + feat slots)

A new "GM Grants" knob in the Settings area letting a GM give a player extra
skill ranks and/or extra feat slots — the homebrew-friendly adjustment a tester
requested. **Custom powers are deferred** (separate stage, broader scope).

## Stage 6: GM Grants — resource budgets

**Goal**: Let a GM add extra skill ranks and/or feat slots to a character, with
those addends reflected in the builder's "remaining" budgets and feat count, and
persisted on `CharacterDoc` so Stage 5 sync carries them.

**Scope** (in / out):
- IN:  `build.gmGrants = { skillRanks?: number; featSlots?: number }`, additive
  only. Negative values allowed (a GM can claw back), clamped to >= -999 by the
  transition.
- IN:  Settings panel UI with two NumberFields, parallel to the existing
  `heroPointsCap` control (SettingsSection.tsx:178-203 is the template).
- IN:  Budget functions read the new field. `skillBudget()` (skills.ts:21) adds
  it to `total`; `expectedFeatCount()` (feats.ts:31) adds it to the return.
- IN:  Builder surfaces it: SkillsSection shows the inflated `remaining`;
  FeatsSection's "expected vs chosen" check treats GM-granted slots as budget.
- OUT: Per-skill or per-feat *specific* grants (e.g. "+2 ranks in Perception",
  "grant Toughness specifically"). The tester can already do the latter by just
  adding the feat id and using `gmGrants.featSlots` to loosen the budget.
- OUT: Custom named powers with `Change`s and resource pools — deferred to a
  later stage; the rabbit hole the user explicitly chose to skip.

**Schema change** (`packages/schema/src/character.ts`, inside `build:` block):

```ts
/**
 * GM/homebrew grants that adjust the build-resource budgets. All values are
 * additive addends to the rules-derived totals: `skillRanks` to the
 * skill-point budget (`model/skills.ts:skillBudget`), `featSlots` to the
 * expected feat count (`model/feats.ts:expectedFeatCount`). Negative values
 * are permitted (a GM may claw back), clamped to >= -999 by the transition.
 *
 * These are *budget* adjustments, not specific grants — they loosen (or
 * tighten) how many ranks/feats the player may spend, not which ones.
 * Omitted fields behave as 0. Back-compat: documents without `gmGrants` are
 * unaffected.
 */
gmGrants?: { skillRanks?: number; featSlots?: number };
```

`schemaVersion` stays at its current value — the field is optional and
additive; old documents load unchanged. No migration needed.

**Engine changes** — none. `compute()` does not read `gmGrants` directly; the
builder's pure budget functions do, which keeps the engine free of house-rule
knowledge. (Same posture as `fcbHouserule`, which also lives entirely in the
builder model layer.)

**Model transitions** (`apps/web/src/model/doc.ts`):

```ts
setGmGrantSkillRanks(doc, n | null): CharacterDoc   // null = delete key
setGmGrantFeatSlots(doc, n | null): CharacterDoc
```

Both clamp to `[-999, 999]`; `null` or NaN deletes the sub-key (mirrors
`setHeroPointsCap` at doc.ts:494-511).

**Budget reads**:
- `skillBudget()` (skills.ts:21): after the FCB block (line 46-48), add
  `total += doc.build.gmGrants?.skillRanks ?? 0;`
- `expectedFeatCount()` (feats.ts:31): before `return`, add
  `+ (doc.build.gmGrants?.featSlots ?? 0);`

Both edits are one line each; both functions already pull from `doc.build` and
are pure, so the engine's deterministic-fixture tests stay green.

**UI** (`apps/web/src/components/builder/SettingsSection.tsx`): new
`<Panel title="GM Grants" step="⚙">` between "Hero Points" and "Manual Stat
Overrides". Two `NumberField`s (allowEmpty, min=-999, max=999) bound to the two
transitions. Hint copy: "Homebrew adjustments to how many skill ranks and feats
this character may spend. Additive to the rules-derived budget." The UI mirrors
`heroPointsCap` exactly — same pattern, same reset behaviour.

**Success Criteria**:
- `bun run typecheck` green.
- `bun run test` green (existing fixtures unchanged; new tests pass).
- Builder: setting `gmGrants.skillRanks = 4` raises the Skills panel
  "remaining" by 4 with no other side effects.
- Builder: setting `gmGrants.featSlots = 2` raises the Feats panel expected
  count by 2, so the player can pick two more feats without the "over budget"
  warning.
- Persistence: reload the page; the grants are still there (exercises Dexie +
  the unchanged export/import JSON).
- Export/import round-trip preserves the field (no migration logic required —
  optional field, additive).

**Tests** (red-first per the workflow):
- `apps/web/test/doc.settings.test.ts`: `setGmGrantSkillRanks`/`setGmGrantFeatSlots`
  set, clear, and clamp (edge: NaN, -1000, +1000, null).
- `apps/web/test/skills.test.ts` (or new): `skillBudget` returns
  `total = rules_derived + gmGrants.skillRanks`; covers +, -, omitted, 0.
- `apps/web/test/feats.test.ts`: `expectedFeatCount` returns
  `base + gmGrants.featSlots`; covers +, -, omitted, 0, and that `chosenFeatCount`
  is unaffected (grants adjust budget, not chosen).
- One regression test asserting that a doc *without* `gmGrants` yields identical
  budgets to before the change — guards back-compat.

**Files touched** (estimate):
1. `packages/schema/src/character.ts` — schema field + JSDoc.
2. `apps/web/src/model/doc.ts` — two transitions.
3. `apps/web/src/model/skills.ts` — one-line addend.
4. `apps/web/src/model/feats.ts` — one-line addend.
5. `apps/web/src/components/builder/SettingsSection.tsx` — one new Panel.
6. Three test files as above.

**Status**: Complete

---

## Deferred: Custom Powers (separate stage, not started)

A "custom power" is first-class build *content*: name, description, typed
`Change`s (reusing the engine's `Change` shape so a custom +2 sacred AC bonus
stacks correctly via `stacking.ts`), and optional resource pools wired into
`live.resources`. Surface in play (not just Settings) so a player doesn't open
Settings mid-session to use a granted power.

Scope is meaningfully larger: schema for `build.customAbilities: CustomAbility[]`,
engine integration into `compute()` (apply each ability's changes via the
existing change-application path), resource pool plumbing, builder UI for
editing, tracker UI for per-day-use tracking. Earns its own stage only when the
tester confirms they need *named, repeatable, possibly resource-bound* abilities
— not just one-off number bumps, which `statOverrides` (character.ts:152) already
covers and which this stage's `gmGrants` covers at the budget level.

**Status**: Not Started (deferred per user)
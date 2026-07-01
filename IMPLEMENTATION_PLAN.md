# Domain Spells + Channel Energy — Cleric

Wiring up cleric domains (spell lists + domain slots) and surfacing channel
energy's dice/save-DC scaling. Channel Energy's *uses/day* pool is already
data-driven from `uses.maxFormula = "3 + @abilities.cha.mod"` (resources.ts) —
the missing piece is the damage-dice and save-DC display, which are prose-only in
the vendored feature (no `changes`).

Clean-room: nothing is read from Foundry's source code. Domain-spell *data*
(`learnedAt.domain` on per-spell docs) IS used — that's open content, not source
code. Channel-dice/DC numbers are clean-room from the published PF1 rules text
that lives only in the feature's prose description.

## Stage 1: Data pipeline — per-domain spell lists

**Goal**: vendored `domain-spell-lists.json` keyed by domain tag → spell level → ids.
**Success Criteria**: `refData.domainSpellLists["Air"]` is a populated SpellList; spells
that are domain-only (not on any sliced class list) are now in `refData.spells`.
**Tests**: refdata test asserting Air domain has a known-level-1 entry; counts.
**Status**: Complete — 37 domains, 43 new spells (2381 → 2424); Control Winds @ Air L5 vendored.

- Widen spell filter (`normalize.ts:116`) to also keep spells with non-empty
  `learnedAt.domain` / `learnedAt.subdomain`.
- Invert per-domain lists into `domainSpellLists: Record<string, SpellList>`.
- Add `domainSpellLists` to `RefData` schema (refdata.ts).
- Emit `domain-spell-lists.json` (emit.ts); load in data-pipeline `index.ts` + web `loader.ts`.
- Bump `SCHEMA_VERSION` 3→4; add counts; regenerate vendored JSON.

## Stage 2: Schema + pure transitions

**Goal**: store the cleric's chosen domains and a domain-slot kind on prepared spells.
**Success Criteria**: `build.clericDomains` round-trips; `PreparedSpell.kind` defaults "normal";
`migrateDoc` upgrades schemaVersion 1→2; pure transitions wired + unit-tested.
**Tests**: doc-transition tests (setClericDomains, prepareDomainSpell, unprepare by kind).
**Status**: Complete — preparedSpells.test.ts gained the "domain spell slots (cleric)" suite.

- `character.ts`: add `build.clericDomains?: string[]`; add `kind?: "normal"|"domain"` to
  `PreparedSpell`; bump doc `schemaVersion` literal in `createEmptyDoc` 1→2; `migrateDoc`.
- `doc.ts`: `setClericDomains`, `prepareDomainSpell`/`unprepareDomainSpell`, `removePreparedAt`
  preserves `kind`; `clearPrepared` keeps kind-agnostic.
- `preparedSpells.ts`: `domainSpellLevelMap(refData, domainTags)` helper.

## Stage 3: Builder UI — domain picker + domain spells surfaced

**Goal**: user picks up to two domains; cleric-only domain spells appear in the builder.
**Success Criteria**: selecting "Air" domain shows Air spells; choice persists.
**Tests**: e2e or component-level render snapshot.
**Status**: Complete — DomainPicker rendered inside ClassesSection (cleric only);
SpellsSection renders a read-only DomainSpellsBlock grouped by level for chosen domains.

- New `DomainPicker.tsx` (renders when cleric is selected; free-choice, soft-warning only).
- Wire into `ClassesSection.tsx` (or `IdentitySection` near deity).
- `SpellsSection.tsx`: surface domain spells for the chosen domains (read-only or
  auto-add to known — read-only preferred; prepared-from-domain handled in tracker).
- Refresh cleric `CasterModel` `learnGuidance`/`blurb` to drop "domain not modelled" caveat.

## Stage 4: Tracker UI — domain slot + channel dice/DC

**Goal**: prepared-spells panel shows one domain slot per accessible spell level; channel
pool shows dice (Xd6) + save DC.
**Success Criteria**: cleric can prepare a domain-only spell in the domain slot; ResourcesPanel
renders "Channel Energy · 4d6 (DC 15)".
**Tests**: engine `channelEnergyDetail` helper test; tracker render check.
**Status**: Complete — `channelEnergyDetail` clean-room in tables.ts; `DerivedResourcePool.detail`
populated when feature.tag === "channelEnergy"; ResourcesPanel surfaces it as the sub-line.
PreparedView excludes domain-kind entries from the class-slot capacity check and renders a
DomainSlotsSection beneath the levels grid (one bonus slot per accessible spell level, picker
sources from the union of chosen domains' lists).

- Engine: `channelEnergyDetail(clericLevel, chaMod)` clean-room helper in `tables.ts`;
  `resources.ts` sets `pool.detail` when feature.tag === "channelEnergy"; `DerivedResourcePool.detail?`.
- `ResourcesPanel.tsx`: render `pool.detail` as the sub-line.
- `PreparedSpellsPanel.tsx` PreparedView: per-level domain slot (1 each accessible level 1-9);
  domain prepare-from picker sourced from `domainSpellLists[chosen]`; bucketing by kind.

## Notes / deferred

- Domain *powers* (the granted abilities from a domain) and subdomains are out of scope —
  the Foundry `domains/` pack carries prose-only descriptions; surfacing them is display-only
  future work (same v1 stance as archetypes).
- Cleric alignment-restricted spells (Chaotic/Evil/Good/Lawful Spells feature) is prose-only;
  spontaneous-casting cure/inflict alignment choice is also deferred — both are display/UX,
  not numeric-tracking work.
- Deity → domain validation is free-choice (no deities pack); matches the project's
  hybrid-prereqs "soft-warning only" philosophy.
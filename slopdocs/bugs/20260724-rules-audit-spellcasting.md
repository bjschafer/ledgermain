# Rules-correctness audit: spellcasting (part 2 of the multi-domain audit)

Audited 2026-07-24 inline (main loop, no subagents). Sibling of
`20260724-rules-audit-derived-math.md`. Scope: engine `tables.ts` spell
section, `metamagic.ts`, compute.ts ASF, web `model/spellcasting.ts`,
`model/casterLevel.ts`, `model/preparedSpells.ts` (school/domain/opposition),
domain-slot UI enforcement, vendored `wizard-schools.json` oppositions.
External verification via aonprd/d20pfsrd fetches where memory was uncertain.
**None fixed yet.**

## Findings (implemented-but-wrong, ranked)

### 1. `casterLevelForClass` returns CL 0 for bard, paladin, ranger, antipaladin
- `apps/web/src/model/casterLevel.ts:42-122` — bard/paladin/ranger/antipaladin
  are in neither `FULL_CASTER_TAGS` nor `LEVEL_GATED_CASTER_TAGS`, so they
  fall through to `return 0` at every level.
- RAW: bard CL = bard level (full, from 1st — no divergence at all).
  Paladin/ranger/antipaladin: no CL through 3rd, then CL = class level − 3.
- The `CASTER_KIND` doc comment (casterLevel.ts:150-155) claims bard's "CL
  diverges from class level" — factually wrong; that misunderstanding is
  probably why bard was left out of `FULL_CASTER_TAGS`.
- Consequences (all verified call paths):
  - `FeatEntry.tsx:99` → `PrereqContext.casterLevel` = 0 → a pure bard/paladin/
    ranger is HARD-blocked (structured prereq) from every CL-prereq feat
    (Arcane Strike, all item-creation feats, …).
  - `PreparedSpellsPanel.tsx:791` `casterLevelForClass(...)` = 0 → tracker
    spell details show CL 0 and `suggestRounds` seeds cast-buff durations
    from CL 0 for these classes.
  - `Sheet.tsx:107` displays CL 0 per class.
- Fix shape: add bard to `FULL_CASTER_TAGS`; add a third shape (gate 4, CL =
  level − 3) for paladin/ranger/antipaladin. The existing
  `LEVEL_GATED_CASTER_TAGS` comment explicitly warns future classes must NOT
  copy the −3 — correct for bloodrager/medium, but the −3 shape is still
  needed for the CRB half-casters.

### 2. `@cl` roll data uses raw class level for paladin/ranger/antipaladin
- `packages/engine/src/rolldata.ts` — `cl: maxClassLevel`, documented as a
  "single-class assumption", no −3 offset for any class.
- Consequence: any buff/spell formula using `@cl` cast by a paladin/ranger/
  antipaladin evaluates ~3 high (e.g. Divine Favor's `min(3, floor(@cl/3))`
  luck bonus: paladin 9 is CL 6 → +2 RAW; engine evaluates @cl=9 → +3).
- Known/documented limitation (casterLevel.ts header comment discusses it) but
  it produces wrong sheet numbers in play, so it belongs on this list.

### 3. User-facing text misstates the cleric domain-slot rule (code is right)
- RAW: ONE domain spell slot per accessible spell level total; the (two)
  domains only widen what may be prepared in it.
- Enforcement is correct (`DomainSlotsSection` `total = 1` per level, union of
  domain lists — PreparedSpellsPanel.tsx:404) but these all say "per chosen
  domain", i.e. two slots/level for a two-domain cleric:
  `model/spellcasting.ts:7` (module comment), `:232-234` (cleric
  learnGuidance + blurb — SHOWN TO USERS), `model/preparedSpells.ts:78-79`,
  `PreparedSpellsPanel.tsx:1175`. Text-only fix.

## Verified with external sources (memory was wrong or uncertain)
- **Bloodrager CL: the code is RIGHT and my initial recollection was wrong.**
  No printing of the ACG (legacy PRD 1st printing, current aonprd with errata,
  d20pfsrd) contains a "bloodrager level − 3" sentence, so the CRB default
  (CL = class level once casting starts at 4th) applies — matching the
  designer rulings the code cites. Do NOT "fix" this to −3.
- Medium: same gated-at-4, full-class-level posture — consistent with OA text.
- Elemental school oppositions (`wizard-schools.json`) all match RAW:
  air→earth, fire→water fixed; earth→{air, wood}, water→{fire, earth} (four-
  element pair + five-element "overcomes" wheel); metal→fire, wood→metal
  (five-element wheel); void and aether → choose one of air/earth/fire/water.

## Checked and found CORRECT (don't re-audit)
- All spells-per-day/known/prepared tables in `tables.ts`, hand-checked row
  anchors against published tables: wizard(=cleric=druid=witch=shaman),
  sorcerer(known too), bard(both; =inquisitor=summoner(+unchained)=skald=
  hunter=mesmerist=occultist=spiritualist), paladin/ranger(=antipaladin),
  magus(=warpriest numerically), alchemist(=investigator), arcanist per-day +
  prepared, bloodrager both, medium both, psychic(=sorcerer both).
  Dash-vs-0 semantics (null vs 0 at e.g. paladin L4) modeled correctly.
- `bonusSpellsForLevel`: floor((mod−L)/4)+1 when mod ≥ L, none for L0 ✔.
- Save DC 10+SL+mod; defensive-casting concentration DC 15+2×SL ✔.
- Metamagic slot adjustments all 10 correct (Empower +2, Maximize +3, Quicken
  +4, Widen +3, Reach +1..3, Heighten variable and uniquely
  `raisesEffectiveLevel`, others +1) ✔.
- ASF: arcane-tag set correct (psychic classes and all divine excluded);
  exemptions correct — bard light+shield, summoner light no-shield, skald
  light/medium+shield, bloodrager light/medium no-shield, magus light/7th
  medium/13th heavy no-shield; multiclass conservative-sum posture.
- Wizard school: +1 slot per level 1–9, never cantrips, Universalist gets
  none; bonus slot restricted to spellbook ∩ school list; opposition spells
  cost 2 prepared slots.
- Bonus-spells-known cadences: sorcerer bloodline 2L+1; bloodrager bloodline
  7/10/13/16; oracle mystery every 2 from 2nd; haunted curse 1/5/10/15; witch
  patron every 2 from 2nd; psychic discipline 1st, 4th, every 2 to 18th;
  shaman spirit magic gated by castable spell level.
- Caster model abilities: all 25+ classes' casting stats correct (incl.
  spiritualist Wis, occultist Int, medium Cha).
- Channel energy floor((L+1)/2)d6, DC 10+L/2+Cha; sneak attack floor((L+1)/2).

## Gaps (absent, not wrong — mostly documented in-code)
Concentration DCs other than defensive casting (damage-while-casting,
grappled, vigorous motion) unmodeled; cleric spontaneous cure/inflict and
druid summon swap untracked; shaman spirit-magic daily spontaneous slots
untracked (documented); occultist implement known-spell subsystem unmodeled
(picker uncapped, documented); oracle cure/inflict auto-known left manual;
antipaladin missing from `CASTER_KIND` (can't be a prestige advancement
target; moot until it can be — but note bard/paladin/ranger ARE there for
advancement while broken per finding 1).

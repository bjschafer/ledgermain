/**
 * Pure spellcasting model for the builder UI. Keeps caster-class knowledge in
 * one place so the registry can be extended when more spell lists are vendored.
 *
 * Wizard, sorcerer, cleric, paladin, ranger, bard, druid, and arcanist are
 * modelled today. Cleric domain spell lists (one bonus prepare-slot per
 * accessible spell level per chosen domain) live in `refData.domainSpellLists`;
 * the tracker's Spells panel renders those slots. The UI falls back gracefully
 * for any caster tag not in CASTER_MODELS. Paladin/ranger are prepared divine
 * half-casters like cleric but with no cantrips and no bonus domain-style
 * slots. Bard is a spontaneous arcane caster like sorcerer (own
 * spells-per-day/known tables, caps at 6th-level spells). Druid is a full
 * prepared-divine caster identical in shape to cleric but with no domain
 * slots. Arcanist (ACG) is a HYBRID caster: a wizard-shaped unbounded
 * spellbook (`build.spells.known`, `preparesFromClassList: false`,
 * `grantsAllCantrips: true` — same simplification as wizard/cleric/druid,
 * treating prepared cantrips as at-will once readied) from which a LIMITED
 * number of spells are prepared each day (`preparedProgression`, wizard-
 * shaped), then cast spontaneously by spending a slot of the matching level
 * from a SEPARATE per-day slot pool (`progression`, sorcerer-shaped) — casting
 * never expends the specific prepared spell. See `preparedCapacityByLevel`
 * below and the "hybrid" branch in `PreparedSpellsPanel.tsx`. Magus is a
 * plain int-based prepared caster (own spells-per-day table, capped at
 * 6th-level spells) — modeled identically to wizard. Oracle is a plain
 * cha-based spontaneous caster casting from the cleric spell list, reusing
 * the sorcerer's spells-per-day/known tables (numerically identical per the
 * SRD) plus mystery-granted bonus spells known (`mysterySpellsKnown` below).
 * Alchemist (APG) and investigator (ACG) are int-based prepared "extract"
 * casters with NO 0-level extracts at all (unlike wizard/cleric cantrips,
 * there is no 0-level tier to grant — `grantsAllCantrips: false`, same as
 * paladin/ranger) and cap at 6th-level extracts; both are modeled here as
 * ordinary prepared casters (`preparation: "prepared"`, own spellbook-
 * equivalent "Formula Book") — the self-targeting/infusion/shareable-with-
 * allies nuances of how an extract is actually consumed are display-only
 * prose, not modeled as distinct mechanics.
 * Inquisitor (APG, Wis), Summoner (APG, Cha), and Skald (ACG, Cha) are three
 * more 6-level-max spontaneous casters, each with 0-level spells cast at will
 * once known (`grantsAllCantrips: false`, same as sorcerer/bard/oracle). Their
 * own `progression`/`knownProgression` tags (`"inquisitor"`/`"summoner"`/
 * `"skald"`) resolve to the bard's tables under the hood (`@pf1/engine`
 * `tables.ts` — verified numerically identical to bard's at every level, not
 * just similarly-shaped). Judgments (inquisitor), eidolon (summoner), and
 * raging song (skald) are separate subsystems, out of scope here — only the
 * spellcasting model is built.
 * Witch (APG) is a plain int-based prepared-arcane caster modeled like
 * wizard, reusing the wizard spells-per-day table (verified identical per the
 * SRD) — her familiar stores her spells like a spellbook (starts with all
 * 0-level witch spells plus 3 + Int-mod 1st-level spells, +2 per new level),
 * so `knownLabel` reads "Familiar's Spells" rather than "Spellbook". Shaman
 * (ACG) is a plain wis-based prepared-divine caster modeled like cleric/druid
 * (reusing the cleric spells-per-day table, also verified identical), with a
 * Spirit Magic bonus-spontaneous-cast mechanic tied to her chosen spirit that
 * is NOT modeled here (same posture as druid's unmodeled spontaneous
 * summoning note).
 * Warpriest (ACG) is a plain wis-based prepared-divine caster with orisons —
 * own spells-per-day table (with a 0-level column), modeled identically to
 * cleric otherwise (`grantsAllCantrips: true`, `preparesFromClassList: true`)
 * — sacred weapon, blessings, and fervor are separate class features not
 * modeled as part of casting. Hunter (ACG) is a wis-based spontaneous divine
 * caster with a genuine spells-known cap (NOT "knows every spell on her
 * list" — the SRD is explicit that her selection is "extremely limited"),
 * reusing the bard's spells-per-day/known tables (numerically identical per
 * the SRD, verified against the raw "Table: Hunter"/"Table: Hunter Spells
 * Known" — same reuse posture as oracle/sorcerer). Bloodrager (ACG) is a
 * cha-based spontaneous arcane caster that gains no spellcasting at all
 * until 4th level and caps at 4th-level spells (own spells-per-day/known
 * tables, both null below level 4) — bloodline bonus spells and bloodrage
 * are separate class features not modeled here.
 * Mesmerist (Cha), Occultist (Int), and Spiritualist (Wis) (Occult
 * Adventures) are three more 6-level-max spontaneous PSYCHIC casters (own
 * spell lists; psychic magic is NOT arcane, so none of the three incur
 * arcane spell failure and none are in `compute.ts`'s `ARCANE_CASTER_TAGS`).
 * Mesmerist's and spiritualist's Spells per Day / Spells Known tables, and
 * occultist's Spells per Day table, are numerically identical to the bard's
 * (verified against aonprd.com's live class pages, all 20 rows) — reused via
 * `tables.ts`'s `MESMERIST_SPELLS_PER_DAY = BARD_SPELLS_PER_DAY`-style
 * aliases, same posture as `oracle: progression: "sorcerer"` above.
 * Occultist is the one exception to every other spontaneous model here: it
 * has NO `knownProgression` at all, because the SRD publishes no generic
 * "Spells Known" table for it — an occultist's known spells are instead
 * granted entirely by her chosen implement schools (one spell per accessible
 * spell level per school), a subsystem that is NOT modeled (implements,
 * resonant powers, and focus powers — see `CASTER_MODELS.occultist`'s own
 * doc comment). Mesmerist Tricks (a resource pool) and Consummate Liar (a
 * flat Bluff bonus) ride the generic vendored `uses.maxFormula`/`changes[]`
 * pipeline for free; Painful Stare and Hypnotic Stare are hand-authored
 * display details in `tables.ts` (`painfulStareLabel`/`hypnoticStareLabel`,
 * wired into `resolveClassFeatures` in `packages/engine/src/archetypes.ts`).
 * The spiritualist's Phantom (an eidolon-like companion) is NOT modeled —
 * same deferred posture as the summoner's eidolon.
 */

import {
  baseSpellsKnown,
  baseSpellsPerDay,
  baseSpellsPrepared,
  ORACLE_CURSES,
  ORACLE_MYSTERIES,
  PSYCHIC_DISCIPLINES,
  WITCH_PATRONS,
  SHAMAN_SPIRITS,
  type SpellKnownProgression,
  type SpellPreparedProgression,
  type SpellProgression,
} from "@pf1/engine";
import type { AbilityId, CharacterDoc, RefData, WizardSchoolTag } from "@pf1/schema";

// ---------------------------------------------------------------------------
// Bonus spells per day
// ---------------------------------------------------------------------------

/**
 * PF1 bonus-spells-per-day granted by a high casting-ability score.
 *
 * Formula: a caster with modifier M gains bonus spell(s) for spell level L
 * when M >= L, counted as floor((M - L) / 4) + 1.
 * Cantrips (spell level 0) never grant bonus spells.
 *
 * @example
 *   bonusSpellsForLevel(3, 1) // → 1  (Int +3: qualifies, (3-1)/4 = 0, +1)
 *   bonusSpellsForLevel(5, 1) // → 2  (Int +5: (5-1)/4 = 1, +1 = 2)
 *   bonusSpellsForLevel(5, 5) // → 1  (Int +5: (5-5)/4 = 0, +1 = 1)
 *   bonusSpellsForLevel(0, 1) // → 0  (modifier too low)
 *   bonusSpellsForLevel(3, 0) // → 0  (cantrips: always 0)
 */
export function bonusSpellsForLevel(abilityMod: number, spellLevel: number): number {
  if (spellLevel === 0) return 0;
  if (abilityMod < spellLevel) return 0;
  return Math.floor((abilityMod - spellLevel) / 4) + 1;
}

// ---------------------------------------------------------------------------
// Caster-model registry
// ---------------------------------------------------------------------------

export interface CasterModel {
  /**
   * "hybrid" (arcanist, ACG) prepares a limited number of spells from her
   * spellbook each day (like `"prepared"`, capped by `preparedProgression`)
   * but then CASTS spontaneously from among those prepared spells by spending
   * a per-level slot (like `"spontaneous"`, capped by `progression`) — casting
   * never expends the specific prepared spell, only a slot.
   */
  preparation: "prepared" | "spontaneous" | "hybrid";
  /** The ability score that governs spellcasting for this class. */
  ability: AbilityId;
  /**
   * Spells-per-day progression table this class uses (engine `tables.ts`).
   * For a `"hybrid"` caster this is the CASTING slot-pool table (sorcerer-
   * shaped) — see `preparedProgression` for the separate wizard-shaped daily
   * prepare cap.
   */
  progression: SpellProgression;
  /**
   * Spells-known progression (spontaneous casters only). When set, the builder
   * shows the known-limit advisory and the tracker uses it to cap additions.
   */
  knownProgression?: SpellKnownProgression;
  /**
   * Spells-PREPARED progression (`"hybrid"` casters only, e.g. arcanist): how
   * many distinct spells from the spellbook may be readied each day at each
   * spell level. Distinct from `progression`'s per-day slot count (how many
   * TIMES those prepared spells may be cast) — see `preparedCapacityByLevel`.
   */
  preparedProgression?: SpellPreparedProgression;
  /** What the "known" list represents in the UI (e.g. "Spellbook"). */
  knownLabel: string;
  /** One-line guidance on how many spells this caster learns per level. */
  learnGuidance: string;
  /** One-line explanation of prepared-vs-spontaneous for the UI hint. */
  blurb: string;
  /**
   * True if this caster knows every cantrip on its class list for free (no
   * selection needed) — e.g. a wizard's spellbook starts with all 0-level
   * wizard spells. When true the builder excludes cantrips from the
   * spellbook and the tracker sources them from the class list as read-only
   * at-will spells. When false (e.g. sorcerer), cantrips are capped by the
   * class's spells-known table at level 0 and picked/removed the same way as
   * any other known spell level; the tracker still casts them at will
   * (unlimited, no slot spent) once known.
   */
  grantsAllCantrips: boolean;
  /**
   * True when this caster has no curated "known" list at all — every spell on
   * the class list is available to prepare each day (e.g. cleric). When true,
   * the builder shows the class list read-only instead of an Add/Remove
   * picker, and the tracker's prepare-from picker sources directly from the
   * class list instead of `build.spells.known`.
   */
  preparesFromClassList: boolean;
}

export const CASTER_MODELS: Record<string, CasterModel> = {
  wizard: {
    preparation: "prepared",
    ability: "int",
    progression: "wizard",
    knownLabel: "Spellbook",
    learnGuidance:
      "Wizards add 2 spells to their spellbook at each new level (more can be scribed from scrolls).",
    blurb:
      "Prepared caster: spells live in your spellbook, then you prepare a subset each day. Your spellbook is your \u201cknown\u201d list here.",
    grantsAllCantrips: true,
    preparesFromClassList: false,
  },
  sorcerer: {
    preparation: "spontaneous",
    ability: "cha",
    progression: "sorcerer",
    knownProgression: "sorcerer",
    knownLabel: "Spells Known",
    learnGuidance:
      "Sorcerers learn a fixed set of spells known at each level (see spells-known table), including a limited number of cantrips. You can cast any spell you know by spending a slot of that level; cantrips are cast at will.",
    blurb:
      "Spontaneous caster: you know a limited set of spells and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  cleric: {
    preparation: "prepared",
    ability: "wis",
    progression: "cleric",
    knownLabel: "Cleric List",
    learnGuidance:
      "Clerics have no spellbook and nothing to learn \u2014 the entire cleric spell list below is always available to prepare from. Each chosen domain also grants one bonus prepare-slot per accessible spell level, drawable from that domain's spell list (see Domain picker above).",
    blurb:
      "Prepared divine caster: there's no \u201cknown\u201d list to curate \u2014 prepare any spell(s) from the full cleric list each day, plus one domain spell per accessible level per chosen domain.",
    grantsAllCantrips: true,
    preparesFromClassList: true,
  },
  paladin: {
    preparation: "prepared",
    ability: "cha",
    progression: "paladin",
    knownLabel: "Paladin List",
    learnGuidance:
      "Paladins have no spellbook and nothing to learn — the entire paladin spell list below is always available to prepare from once you reach 4th level. Paladins never gain cantrips.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full paladin list each day, from spell level 1 up to a maximum of 4th, starting at 4th level.",
    grantsAllCantrips: false,
    preparesFromClassList: true,
  },
  ranger: {
    preparation: "prepared",
    ability: "wis",
    progression: "ranger",
    knownLabel: "Ranger List",
    learnGuidance:
      "Rangers have no spellbook and nothing to learn — the entire ranger spell list below is always available to prepare from once you reach 4th level. Rangers never gain cantrips.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full ranger list each day, from spell level 1 up to a maximum of 4th, starting at 4th level.",
    grantsAllCantrips: false,
    preparesFromClassList: true,
  },
  bard: {
    preparation: "spontaneous",
    ability: "cha",
    progression: "bard",
    knownProgression: "bard",
    knownLabel: "Spells Known",
    learnGuidance:
      "Bards learn a fixed set of spells known at each level (see spells-known table), including a limited number of cantrips. You can cast any spell you know by spending a slot of that level; cantrips are cast at will. Bards cap out at 6th-level spells.",
    blurb:
      "Spontaneous caster: you know a limited set of spells and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  druid: {
    preparation: "prepared",
    ability: "wis",
    progression: "druid",
    knownLabel: "Druid List",
    learnGuidance:
      "Druids have no spellbook and nothing to learn — the entire druid spell list below is always available to prepare from.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full druid list each day. (Druids can also spontaneously swap a prepared spell for a summon nature's ally spell of the same level or lower — not modeled here, same posture as cleric's spontaneous cure/inflict casting.)",
    grantsAllCantrips: true,
    preparesFromClassList: true,
  },
  arcanist: {
    preparation: "hybrid",
    ability: "int",
    progression: "arcanist",
    preparedProgression: "arcanist",
    knownLabel: "Spellbook",
    learnGuidance:
      "Arcanists add 2 spells to their spellbook at each new level (more can be scribed from scrolls), same as a wizard.",
    blurb:
      "Hybrid caster: each day, prepare a limited number of spells from your spellbook (wizard-style, capped by the Spells Prepared table) in the tracker's Spells panel, then cast any of them spontaneously by spending a slot of that level (sorcerer-style, capped by the Spells per Day table). Casting never expends the specific prepared spell — only a slot.",
    grantsAllCantrips: true,
    preparesFromClassList: false,
  },
  magus: {
    preparation: "prepared",
    ability: "int",
    progression: "magus",
    knownLabel: "Spellbook",
    learnGuidance:
      "Magi begin play with their spellbook containing all 0-level magus spells plus 3 1st-level magus spells of choice, plus a number of additional 1st-level spells equal to their Intelligence modifier. At each new magus level, they add 2 more magus spells of any level they can cast to their spellbook, same as a wizard.",
    blurb:
      "Prepared caster: spells live in your spellbook (int-based, magus spell list, caps at 6th-level spells), then you prepare a subset each day, exactly like a wizard. Your spellbook is your “known” list here.",
    grantsAllCantrips: true,
    preparesFromClassList: false,
  },
  oracle: {
    preparation: "spontaneous",
    ability: "cha",
    // Oracle's Spells per Day / Spells Known tables are numerically identical
    // to the sorcerer's (PF1 SRD — verified against aonprd.com/d20pfsrd.com:
    // both match at every spot-checked level, including L20's all-6s/all-3s-
    // downshift shape), so the sorcerer progression tables are reused rather
    // than duplicated — same posture as `druid: DRUID_SPELLS_PER_DAY =
    // WIZARD_SPELLS_PER_DAY` in `@pf1/engine` `tables.ts`.
    progression: "sorcerer",
    knownProgression: "sorcerer",
    knownLabel: "Spells Known",
    learnGuidance:
      "Oracles learn a fixed set of spells known at each level from the cleric spell list (see spells-known table), starting with 4 orisons and 2 1st-level spells at 1st level. An oracle also adds every “cure” spell OR every “inflict” spell she can cast to her known list for free (a permanent choice made at 1st level, not tracked as a separate field here — add the relevant spells to your known list manually). Her mystery (see the Mystery picker) also grants one bonus spell known at 2nd level and every two levels thereafter.",
    blurb:
      "Spontaneous divine caster: you know a limited set of spells drawn from the cleric list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed; orisons (cantrips) are cast at will once known.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  alchemist: {
    preparation: "prepared",
    ability: "int",
    progression: "alchemist",
    knownLabel: "Formula Book",
    learnGuidance:
      "Alchemists begin play with 2 first-level formulae of their choice, plus a number of additional formulae equal to their Intelligence modifier. At each new alchemist level, they gain one new formula of any level they can create; formulae can also be added by studying a wizard's spellbook (same costs/time as a wizard learning a new spell). Alchemists have no 0-level extracts at all.",
    blurb:
      "Prepared caster: your formula book holds every extract formula you know; prepare a subset each day like a wizard preparing spells. Modeled here as an ordinary prepared caster — extracts are physically brewed, self-targeting/shareable, and consumed as items rather than cast directly, none of which is modeled beyond the per-day preparation count.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  investigator: {
    preparation: "prepared",
    ability: "int",
    // Investigator (ACG) extracts-per-day are numerically identical to the
    // alchemist's own table (PF1 ACG SRD — cross-checked against aonprd.com
    // and d20pfsrd.com, both matching exactly at every level), so the
    // alchemist progression key is reused rather than duplicated (see
    // `INVESTIGATOR_EXTRACTS_PER_DAY = ALCHEMIST_EXTRACTS_PER_DAY` in
    // `@pf1/engine` `tables.ts`).
    progression: "investigator",
    knownLabel: "Formula Book",
    learnGuidance:
      "Investigators begin play with 2 first-level formulae of their choice, plus a number of additional formulae equal to their Intelligence modifier. At each new investigator level, they gain one new formula of any level they can create; formulae can also be added by studying a wizard's spellbook, or by studying another investigator's or an alchemist's formula book (and vice versa). Investigators have no 0-level extracts at all.",
    blurb:
      "Prepared caster: your formula book holds every extract formula you know; prepare a subset each day like a wizard preparing spells. Modeled here as an ordinary prepared caster — extracts are physically brewed, self-targeting/shareable, and consumed as items rather than cast directly, none of which is modeled beyond the per-day preparation count.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  inquisitor: {
    preparation: "spontaneous",
    ability: "wis",
    // Inquisitor's Spells per Day / Spells Known tables (APG) are numerically
    // identical to the bard's (verified against aonprd.com and
    // legacy.aonprd.com: both match at every spot-checked level, 1-20,
    // including the all-5s/all-6s L20 shape), so the bard progression tables
    // are reused rather than duplicated — same posture as `oracle: sorcerer`
    // above.
    progression: "inquisitor",
    knownProgression: "inquisitor",
    knownLabel: "Spells Known",
    learnGuidance:
      "Inquisitors learn a fixed set of spells known at each level from the inquisitor spell list (see spells-known table), starting with 4 orisons and 2 1st-level spells at 1st level. You can cast any spell you know by spending a slot of that level; orisons (cantrips) are cast at will once known. Inquisitors cap out at 6th-level spells. (Judgments, bane, and the other inquisitor class features are separate subsystems, not modeled here.)",
    blurb:
      "Spontaneous divine caster: you know a limited set of spells drawn from the inquisitor list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  summoner: {
    preparation: "spontaneous",
    ability: "cha",
    // Summoner's Spells per Day / Spells Known tables (APG) are numerically
    // identical to the bard's (verified against aonprd.com and
    // legacy.aonprd.com, both matching exactly), so the bard progression
    // tables are reused rather than duplicated — same posture as
    // `oracle: sorcerer` above.
    progression: "summoner",
    knownProgression: "summoner",
    knownLabel: "Spells Known",
    learnGuidance:
      "Summoners learn a fixed set of spells known at each level from the (very short) summoner spell list (see spells-known table), starting with 4 orisons and 2 1st-level spells at 1st level. You can cast any spell you know by spending a slot of that level; orisons (cantrips) are cast at will once known. Summoners cap out at 6th-level spells. (The eidolon, life link, and the summoner's other companion-focused class features are a separate subsystem, not modeled here.)",
    blurb:
      "Spontaneous arcane caster: you know a limited set of spells drawn from the summoner list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  skald: {
    preparation: "spontaneous",
    ability: "cha",
    // Skald's Spells per Day / Spells Known tables (ACG) are numerically
    // identical to the bard's — unsurprising, since a skald casts "arcane
    // spells drawn from the bard spell list" (verified against aonprd.com and
    // legacy.aonprd.com, both matching exactly) — so the bard progression
    // tables are reused rather than duplicated, same posture as
    // `oracle: sorcerer` above.
    progression: "skald",
    knownProgression: "skald",
    knownLabel: "Spells Known",
    learnGuidance:
      "Skalds learn a fixed set of spells known at each level from the bard spell list (see spells-known table), starting with 4 cantrips and 2 1st-level spells at 1st level. You can cast any spell you know by spending a slot of that level; cantrips are cast at will once known. Skalds cap out at 6th-level spells.",
    blurb:
      "Spontaneous arcane caster: you know a limited set of spells drawn from the bard list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed. (Raging song — the skald's rage-powered bardic-performance-alike — is a separate subsystem and not part of this casting model.)",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  witch: {
    preparation: "prepared",
    ability: "int",
    // Witch's Spells per Day table is numerically identical to the wizard's
    // (PF1 APG SRD — verified against aonprd.com's "Table: Witch": exact
    // match at every level, including the L20 all-4s row), so the wizard
    // progression table is reused rather than duplicated — same posture as
    // `magus`/`druid` above.
    progression: "witch",
    knownLabel: "Familiar's Spells",
    learnGuidance:
      "A witch's familiar stores her spells like a spellbook: it begins play storing all 0-level witch spells plus 3 1st-level spells of her choice, plus a number of additional 1st-level spells equal to her Intelligence modifier. At each new witch level, she adds 2 more spells of any level she can cast to her familiar.",
    blurb:
      "Prepared caster: your familiar stores your spells like a spellbook (int-based, witch spell list), then you prepare a subset each day, exactly like a wizard. “Familiar's Spells” is your “known” list here — the familiar-link mechanics themselves (losing access if the familiar dies, etc.) aren't modeled.",
    grantsAllCantrips: true,
    preparesFromClassList: false,
  },
  shaman: {
    preparation: "prepared",
    ability: "wis",
    // Shaman's Spells per Day table is numerically identical to the
    // cleric's/wizard's (PF1 ACG SRD — verified against aonprd.com's "Table:
    // Shaman": exact match at every level, including the L20 all-4s row), so
    // the cleric progression table is reused rather than duplicated — same
    // posture as `cleric`/`druid` above.
    progression: "shaman",
    knownLabel: "Shaman List",
    learnGuidance:
      "Shamans have no spellbook and nothing to learn — the entire shaman spell list below is always available to prepare from. Her chosen spirit (see the Spirit picker) also grants a Spirit Magic spell list — one spell per spell level, 1st through 9th — shown as bonus known spells once she can cast that level (see model/spellcasting.shamanSpiritSpellsKnown). RAW she can additionally cast ONE of those spirit-magic spells per spell level per day SPONTANEOUSLY, without expending a normal prepared slot — that specific per-level daily-cast bookkeeping isn't tracked as its own resource pool here (a single fungible per-day counter would misrepresent 9 separate per-level uses), so treat the spirit-magic list as a reminder of which spells you can freely swap in.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full shaman list each day, plus your spirit's Spirit Magic bonus spells (shown once accessible). Spirit-specific hexes (see the Hexes picker) are a separate class feature, not part of casting.",
    grantsAllCantrips: true,
    preparesFromClassList: true,
  },
  warpriest: {
    preparation: "prepared",
    ability: "wis",
    progression: "warpriest",
    knownLabel: "Warpriest List",
    learnGuidance:
      "Warpriests have no spellbook and nothing to learn — the entire warpriest list below is always available to prepare from, including orisons.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full warpriest list each day, plus orisons at will. (Sacred weapon, blessings, and fervor are separate class features, not modeled as part of casting.)",
    grantsAllCantrips: true,
    preparesFromClassList: true,
  },
  hunter: {
    preparation: "spontaneous",
    ability: "wis",
    // Hunter's Spells per Day / Spells Known tables (ACG) are numerically
    // identical to the bard's (verified against the raw "Table: Hunter" /
    // "Table: Hunter Spells Known" on legacy.aonprd.com, both capping at
    // 6th-level spells with the same known-count progression), so the bard
    // progression tables are reused rather than duplicated — same posture as
    // `oracle: progression: "sorcerer"` above.
    progression: "bard",
    knownProgression: "bard",
    knownLabel: "Spells Known",
    learnGuidance:
      "Unlike druids and rangers, a hunter's spell selection is extremely limited: she learns a fixed set of spells known at each level (see spells-known table), including a limited number of orisons, drawn from the combined druid/ranger list. She begins play knowing four 0-level spells and two 1st-level spells of her choice.",
    blurb:
      "Spontaneous divine caster: you know a limited set of spells and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed; orisons (cantrips) are cast at will once known. (Animal Focus and the animal companion are separate class features, not modeled as part of casting.)",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  bloodrager: {
    preparation: "spontaneous",
    ability: "cha",
    progression: "bloodrager",
    knownProgression: "bloodrager",
    knownLabel: "Spells Known",
    learnGuidance:
      "Bloodragers gain no spellcasting at all until 4th level, learning a fixed set of spells known from the bloodrager list from then on (see spells-known table). Bloodragers never gain cantrips/orisons.",
    blurb:
      "Spontaneous arcane caster: you gain no spells until 4th level, then know a limited set of spells (up to 4th level) and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed. (Bloodline bonus spells and bloodrage are separate class features, not modeled here.)",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  antipaladin: {
    preparation: "prepared",
    ability: "cha",
    // Antipaladin (APG) is a mirror of paladin: "His base daily spell
    // allotment is the same as that of a paladin" (vendored "Antipaladin
    // Spells" class-feature description, verbatim) — reuses the paladin
    // progression table (`antipaladin: PALADIN_RANGER_SPELLS_PER_DAY` in
    // `@pf1/engine` `tables.ts`) rather than duplicating it, same posture as
    // `oracle: sorcerer` above.
    progression: "antipaladin",
    knownLabel: "Antipaladin List",
    learnGuidance:
      "Antipaladins have no spellbook and nothing to learn — the entire antipaladin spell list below is always available to prepare from once you reach 4th level. Antipaladins never gain cantrips.",
    blurb:
      "Prepared divine caster: there's no “known” list to curate — prepare any spell(s) from the full antipaladin list each day, from spell level 1 up to a maximum of 4th, starting at 4th level.",
    grantsAllCantrips: false,
    preparesFromClassList: true,
  },
  summonerUnchained: {
    preparation: "spontaneous",
    ability: "cha",
    // Summoner (Unchained)'s Spells per Day / Spells Known tables (PZO1128)
    // are numerically identical to the base summoner's — see
    // `SUMMONER_UNCHAINED_SPELLS_PER_DAY`/`_KNOWN`'s doc comment in
    // `@pf1/engine` `tables.ts` — so its own `"summonerUnchained"`
    // progression/knownProgression tags alias the summoner's tables under the
    // hood, same posture as `oracle: sorcerer` above. Its SPELL LIST itself
    // does differ (vendored separately as `refData.spellLists.summonerUnchained`
    // — e.g. Haste/Slow moved from 2nd to 3rd level vs. the base summoner
    // list), which `casterClassesOf`/`knownSpellsFor` already resolve
    // correctly since both are keyed by classTag, not by progression.
    progression: "summonerUnchained",
    knownProgression: "summonerUnchained",
    knownLabel: "Spells Known",
    learnGuidance:
      "Summoners learn a fixed set of spells known at each level from the (very short) summoner spell list (see spells-known table), starting with 4 orisons and 2 1st-level spells at 1st level. You can cast any spell you know by spending a slot of that level; orisons (cantrips) are cast at will once known. Summoners cap out at 6th-level spells. (The eidolon, life link, and the summoner's other companion-focused class features are a separate subsystem, not modeled here — same posture as the base summoner.)",
    blurb:
      "Spontaneous arcane caster: you know a limited set of spells drawn from the Unchained summoner list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  mesmerist: {
    preparation: "spontaneous",
    ability: "cha",
    // Mesmerist's Spells per Day / Spells Known tables (Occult Adventures)
    // are numerically identical to the bard's (verified against aonprd.com,
    // all 20 rows for both tables), so the bard progression tables are
    // reused rather than duplicated — same posture as
    // inquisitor/summoner/skald/hunter above.
    progression: "mesmerist",
    knownProgression: "mesmerist",
    knownLabel: "Spells Known",
    learnGuidance:
      "Mesmerists learn a fixed set of spells known at each level from the mesmerist spell list (see spells-known table), starting with 4 knacks (0-level spells) and 2 first-level spells at 1st level. You can cast any spell you know by spending a slot of that level; knacks are cast at will once known. Mesmerists cap out at 6th-level spells. (Mesmerist Tricks — a resource pool — and Consummate Liar and Painful Stare — display-only bonuses — are separate class features; which specific tricks are implanted is not modeled, same posture as other prose-only, choice-bearing subsystems in this engine.)",
    blurb:
      "Spontaneous psychic caster: you know a limited set of spells drawn from the mesmerist list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed. Psychic magic is not arcane — no arcane spell failure applies.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  occultist: {
    preparation: "spontaneous",
    ability: "int",
    // Occultist's Spells per Day table (Occult Adventures) is numerically
    // identical to the bard's (verified against aonprd.com, all 20 rows) —
    // same posture as hunter's direct bard-table reuse above. UNLIKE every
    // other spontaneous model in this registry, occultist deliberately has
    // NO `knownProgression`: the SRD publishes no generic "Spells Known"
    // table for this class at all. An occultist's spells known are instead
    // granted entirely by her implement schools (two chosen at 1st level,
    // one more at 2nd level and every 4 levels thereafter, to a maximum of
    // seven; each school grants one spell per accessible spell level) — a
    // real, vendored-but-unlinked subsystem (8 "*-resonant-school"
    // class-abilities entries exist in the pipeline's raw cache but are not
    // referenced from the Occultist class's own feature grants, so wiring an
    // implement-school picker + resonant/focus powers is nontrivial and is
    // deliberately NOT built here, same posture as the summoner's eidolon).
    // Leaving `knownProgression` unset makes the known-spell picker simply
    // unbounded (no advisory cap enforced) rather than inventing a fake
    // table — `spellsKnownLimitsByLevel` already handles a missing
    // `knownProgression` gracefully (returns `[]`).
    progression: "occultist",
    knownLabel: "Spells Known",
    learnGuidance:
      "An occultist's spells known are governed by her implement schools (not modeled here, so no known-spell cap is enforced) — add spells to your known list according to your implement selections. She gains two implement schools at 1st level, a further school at 2nd level and every 4 levels thereafter (to a maximum of seven), each granting one spell of every spell level she can cast. Knacks (0-level spells) are likewise granted per implement school, not tracked separately. Mental Focus (a resource pool spent to activate focus powers) rides the generic per-day pool pipeline; implements, resonant powers, and focus powers themselves are a separate subsystem, not modeled here.",
    blurb:
      "Spontaneous psychic caster: casts spells known from her implement schools by spending a slot of the appropriate level. No daily preparation needed. Psychic magic is not arcane — no arcane spell failure applies. (Implements, resonant powers, and focus powers are a separate subsystem, not modeled here.)",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  spiritualist: {
    preparation: "spontaneous",
    ability: "wis",
    // Spiritualist's Spells per Day / Spells Known tables (Occult
    // Adventures) are numerically identical to the bard's (verified against
    // aonprd.com, all 20 rows for both tables) — same posture as
    // inquisitor/summoner/skald/hunter/mesmerist above. Note the governing
    // ability is Wisdom, not Charisma — unlike most other 6-level
    // spontaneous casters in this registry.
    progression: "spiritualist",
    knownProgression: "spiritualist",
    knownLabel: "Spells Known",
    learnGuidance:
      "Spiritualists learn a fixed set of spells known at each level from the spiritualist spell list (see spells-known table), starting with 4 knacks (0-level spells) and 2 first-level spells at 1st level. You can cast any spell you know by spending a slot of that level; knacks are cast at will once known. Spiritualists cap out at 6th-level spells. (The phantom — the spiritualist's eidolon-like companion — is a separate subsystem, not modeled here, same posture as the summoner's eidolon; the engine's familiar/animal-companion infrastructure — packages/engine/src/familiar.ts and companion.ts — is the likely future implementation path.)",
    blurb:
      "Spontaneous psychic caster: you know a limited set of spells drawn from the spiritualist list and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed. Psychic magic is not arcane — no arcane spell failure applies.",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  psychic: {
    preparation: "spontaneous",
    ability: "int",
    // Psychic's Spells per Day AND Spells Known tables (Occult Adventures)
    // are numerically identical to the sorcerer's — verified against the raw
    // "Table: Psychic" / "Table: Psychic Spells Known" on legacy.aonprd.com,
    // exact match at every one of the 20 levels for both tables — so the
    // sorcerer progression tables are reused rather than duplicated, same
    // posture as `oracle` above (which reuses both the same way).
    progression: "psychic",
    knownProgression: "sorcerer",
    knownLabel: "Spells Known",
    learnGuidance:
      "Psychics learn a fixed set of spells known at each level from the psychic spell list (see spells-known table), starting with 4 knacks (cantrips) and 2 1st-level spells at 1st level — the counts are fixed and not adjusted by Intelligence. Your discipline (see the Discipline picker) also grants one bonus spell known at 1st level, 4th level, and every 2 levels thereafter (final one at 18th).",
    blurb:
      "Spontaneous psychic caster (int-based): you know a limited set of spells and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed; knacks (cantrips) are cast at will once known. Psychic magic is neither arcane nor divine — no arcane spell failure from armor. (Phrenic pool is tracked as a resource; phrenic amplifications and discipline powers are separate subsystems, not modeled here.)",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
  medium: {
    preparation: "spontaneous",
    ability: "cha",
    progression: "medium",
    knownProgression: "medium",
    knownLabel: "Spells Known",
    learnGuidance:
      "Mediums gain no spellcasting at all until 4th level (2 knacks at 1st level aside — knacks are known from 1st but the first real spell slot arrives at 4th), learning a fixed set of spells known from the medium list from then on (see spells-known table); the counts are fixed and not adjusted by Charisma. Mediums cap out at 4th-level spells.",
    blurb:
      "Spontaneous psychic caster (cha-based, 4-level): you know a limited set of spells (up to 4th level, starting at class level 4) and cast any of them on the fly by spending a slot of the appropriate level. No daily preparation needed; knacks (cantrips) are cast at will once known. (Spirits — the medium's channeled-legend subsystem, chosen at each day's seance — plus spirit surge, shared seance, and taboos are separate subsystems, not modeled here.)",
    grantsAllCantrips: false,
    preparesFromClassList: false,
  },
};

/** Returns the CasterModel for `tag`, or `undefined` if it is not in the registry. */
export function casterModelFor(tag: string): CasterModel | undefined {
  return CASTER_MODELS[tag];
}

// ---------------------------------------------------------------------------
// Granted cantrips
// ---------------------------------------------------------------------------

/**
 * The cantrips (level-0 spells) a caster with `grantsAllCantrips` knows for
 * free, derived from the class spell list. Sorted by name. Empty when the
 * class has no vendored spell list. Callers should only invoke this for models
 * whose `grantsAllCantrips` is true; the grant semantics are the caller's
 * responsibility (this just reads the level-0 slice of the class list).
 */
export function grantedCantrips(
  refData: RefData,
  casterTag: string,
): { id: string; name: string }[] {
  const ids = refData.spellLists[casterTag]?.[0];
  if (!ids) return [];
  const out: { id: string; name: string }[] = [];
  for (const id of ids) {
    const sp = refData.spells[id];
    out.push({ id, name: sp?.name ?? id });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Spell slots per day
// ---------------------------------------------------------------------------

/** Slot capacity at one spell level: base (table) + bonus (ability) = total. */
export interface SpellSlotLevel {
  /** Spell level, 0–9. */
  level: number;
  /** Base slots from the class progression table. */
  base: number;
  /** Bonus slots from a high casting ability (0 for cantrips). */
  bonus: number;
  /** Slots available to prepare at this level. */
  total: number;
}

/**
 * Slots-per-day for every spell level the caster can access at `classLevel`,
 * combining the engine's base table with ability bonus spells. Levels with no
 * access (base `null`) are omitted. `abilityMod` is the final casting-ability
 * modifier from the computed sheet.
 */
export function spellSlotsByLevel(
  model: CasterModel,
  classLevel: number,
  abilityMod: number,
): SpellSlotLevel[] {
  const out: SpellSlotLevel[] = [];
  for (let level = 0; level <= 9; level++) {
    const base = baseSpellsPerDay(model.progression, classLevel, level);
    if (base === null) continue;
    const bonus = bonusSpellsForLevel(abilityMod, level);
    out.push({ level, base, bonus, total: base + bonus });
  }
  return out;
}

/**
 * Spell levels (0–9) this caster can access at `classLevel`, per the base
 * progression table. Ability-score bonus spells never unlock a new level, so
 * (unlike {@link spellSlotsByLevel}) this needs no ability modifier — it's
 * cheap to call from the builder, before a computed sheet exists, to filter
 * a spell-list reference down to what's actually reachable yet.
 */
export function accessibleSpellLevels(model: CasterModel, classLevel: number): number[] {
  const out: number[] = [];
  for (let level = 0; level <= 9; level++) {
    if (baseSpellsPerDay(model.progression, classLevel, level) !== null) out.push(level);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spells-known limits (spontaneous casters)
// ---------------------------------------------------------------------------

/**
 * Maximum spells known at each accessible spell level for a spontaneous caster.
 * Levels with no access (null) are omitted. Only meaningful when the model has
 * a `knownProgression`. Returns empty array for prepared casters.
 */
export function spellsKnownLimitsByLevel(
  model: CasterModel,
  classLevel: number,
): { level: number; limit: number }[] {
  if (!model.knownProgression) return [];
  const out: { level: number; limit: number }[] = [];
  for (let level = 0; level <= 9; level++) {
    const limit = baseSpellsKnown(model.knownProgression, classLevel, level);
    if (limit === null) continue;
    out.push({ level, limit });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spells-prepared capacity ("hybrid" caster, e.g. arcanist)
// ---------------------------------------------------------------------------

/**
 * Maximum number of distinct spells a `"hybrid"` caster (e.g. arcanist) may
 * have PREPARED (readied from her spellbook) at each spell level, including
 * cantrips (level 0) — unlike {@link spellSlotsByLevel}'s per-day slot pool,
 * this is never adjusted by ability-score bonus spells (no vendored/SRD bonus
 * column for "spells prepared"). Levels with no access (null) are omitted.
 * Returns empty array when the model has no `preparedProgression`.
 */
export function preparedCapacityByLevel(
  model: CasterModel,
  classLevel: number,
): { level: number; limit: number }[] {
  if (!model.preparedProgression) return [];
  const out: { level: number; limit: number }[] = [];
  for (let level = 0; level <= 9; level++) {
    const limit = baseSpellsPrepared(model.preparedProgression, classLevel, level);
    if (limit === null) continue;
    out.push({ level, limit });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Spell detail helpers (Task 2)
// ---------------------------------------------------------------------------

/**
 * Save DC for a spell: 10 + spell level + casting-ability modifier.
 * Only meaningful when the spell actually allows a saving throw.
 *
 * @example
 *   spellSaveDC(3, 4) // → 17  (10 + 3 + 4)
 */
export function spellSaveDC(spellLevel: number, abilityMod: number): number {
  return 10 + spellLevel + abilityMod;
}

/**
 * Concentration check DC to cast defensively (to avoid provoking an AoO):
 * 15 + 2 × spell level. This is the standard PF1 defensive-casting DC.
 *
 * @example
 *   concentrationDC(3) // → 21  (15 + 6)
 *   concentrationDC(0) // → 15  (cantrips)
 */
export function concentrationDC(spellLevel: number): number {
  return 15 + 2 * spellLevel;
}

// ---------------------------------------------------------------------------
// Bloodline bonus spells (sorcerer)
// ---------------------------------------------------------------------------

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
): { id: string; name: string; level: number }[] {
  if (!bloodlineTag) return [];
  const list = refData.bloodlineSpellLists[bloodlineTag];
  if (!list) return [];
  const out: { id: string; name: string; level: number }[] = [];
  for (let level = 1; level <= 9; level++) {
    if (2 * level + 1 > sorcererLevel) break;
    for (const id of list[level] ?? []) {
      const sp = refData.spells[id];
      out.push({ id, name: sp?.name ?? id, level });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Oracle mystery + curse bonus spells
// ---------------------------------------------------------------------------

/**
 * Oracle mystery bonus spells known at `oracleLevel` for the given
 * `mysteryTag`. Unlike {@link bloodlineSpellsKnown}'s `2L+1` formula, a
 * mystery grants exactly one bonus spell at oracle level 2 and every two
 * levels thereafter (PF1 RAW), so `OracleMysteryDef.bonusSpells` is already
 * keyed by the ORACLE level that unlocks it (see `@pf1/engine`
 * `oracle-mysteries.ts`'s doc comment) — this just filters by that level and
 * resolves each entry's vendored spell id against `refData.spells` (falling
 * back to the table's own `name` if a data drift ever drops the id).
 *
 * These are *bonus* spells known — the tracker/builder add them to the
 * displayed known list automatically and they do NOT count against the
 * spells-known cap.
 *
 * @example
 *   mysterySpellsKnown(ref, "life", 5)  // → [Detect Undead, Lesser Restoration]
 *   mysterySpellsKnown(ref, "life", 1)  // → []  (starts at oracle level 2)
 */
export function mysterySpellsKnown(
  refData: RefData,
  mysteryTag: string | undefined,
  oracleLevel: number,
): { id: string; name: string; level: number }[] {
  if (!mysteryTag) return [];
  const mystery = ORACLE_MYSTERIES[mysteryTag];
  if (!mystery) return [];
  return mystery.bonusSpells
    .filter((sp) => sp.level <= oracleLevel)
    .map((sp) => ({ id: sp.id, name: refData.spells[sp.id]?.name ?? sp.name, level: sp.level }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Oracle curse bonus spells known at `oracleLevel` for the given `curseTag`
 * (only "haunted" grants any, at 1st/5th/10th/15th level). Same shape and
 * "bonus, uncapped" posture as {@link mysterySpellsKnown}.
 */
export function curseSpellsKnown(
  refData: RefData,
  curseTag: string | undefined,
  oracleLevel: number,
): { id: string; name: string; level: number }[] {
  if (!curseTag) return [];
  const curse = ORACLE_CURSES[curseTag];
  if (!curse?.bonusSpells) return [];
  return curse.bonusSpells
    .filter((sp) => sp.level <= oracleLevel)
    .map((sp) => ({ id: sp.id, name: refData.spells[sp.id]?.name ?? sp.name, level: sp.level }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Witch patron bonus spells
// ---------------------------------------------------------------------------

/**
 * Case-insensitive spell-name -> id index over `refData.spells`, cached per
 * `RefData` instance (a `WeakMap` so it never outlives — or gets confused
 * across — a swapped-in test fixture's `refData`). Unlike
 * `mysterySpellsKnown`'s bonus spells (real vendored Foundry `_id`s copied
 * straight from the mystery's own prose — see `@pf1/engine`
 * `oracle-mysteries.ts`'s doc comment), a witch patron's bonus spells carry
 * ONLY a name (`@pf1/engine` `witch-patrons.ts`'s doc comment explains why —
 * no vendored per-patron linkage exists to copy an id from), so
 * {@link patronSpellsKnown} resolves them by name at runtime instead.
 */
const spellNameIndexCache = new WeakMap<RefData, Map<string, string>>();
function spellIdByName(refData: RefData, name: string): string | undefined {
  let index = spellNameIndexCache.get(refData);
  if (!index) {
    index = new Map();
    for (const [id, sp] of Object.entries(refData.spells)) {
      index.set(sp.name.toLowerCase(), id);
    }
    spellNameIndexCache.set(refData, index);
  }
  return index.get(name.toLowerCase());
}

/**
 * Witch patron bonus spells known at `witchLevel` for the given `patronTag`.
 * Same "bonus, uncapped, unlocked at a fixed even class level" shape as
 * {@link mysterySpellsKnown} (PF1 RAW: "at 2nd level and every two levels
 * thereafter, a witch learns an additional spell based on her patron... added
 * to the list of spells she knows") — added to the familiar's known spells
 * rather than an oracle's spontaneous list, but the mechanic is otherwise
 * identical, so `WitchPatronDef.bonusSpells` is already keyed by the WITCH
 * level that unlocks it (see `@pf1/engine` `witch-patrons.ts`'s doc comment).
 *
 * Unlike `mysterySpellsKnown`, this resolves each entry's spell by NAME (via
 * {@link spellIdByName}) rather than a vendored id, since patrons carry no
 * id to begin with — when a name doesn't resolve against the vendored spell
 * slice (a few of the highest-level patron spells are outside the pipeline's
 * current slice), a synthetic `patron:<slug>` id is used instead so the
 * entry still displays by name (degrading gracefully, same posture
 * `mysterySpellsKnown`'s own id-fallback documents — see that function's
 * doc comment).
 *
 * @example
 *   patronSpellsKnown(ref, "healing", 5)  // → 2 spells (unlocked at L2, L4)
 *   patronSpellsKnown(ref, "healing", 1)  // → []  (starts at witch level 2)
 */
export function patronSpellsKnown(
  refData: RefData,
  patronTag: string | undefined,
  witchLevel: number,
): { id: string; name: string; level: number }[] {
  if (!patronTag) return [];
  const patron = WITCH_PATRONS[patronTag];
  if (!patron) return [];
  return patron.bonusSpells
    .filter((sp) => sp.level <= witchLevel)
    .map((sp) => {
      const id = spellIdByName(refData, sp.name);
      const name = id ? (refData.spells[id]?.name ?? sp.name) : sp.name;
      return {
        id: id ?? `patron:${sp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        name,
        level: sp.level,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Psychic discipline bonus spells
// ---------------------------------------------------------------------------

/**
 * Psychic discipline bonus spells known at `psychicLevel` for the given
 * `disciplineTag`. A discipline grants one bonus spell at psychic level 1,
 * another at 4th, and every 2 levels thereafter until 18th (PF1 Occult
 * Adventures RAW — a different cadence from both bloodlines' `2L+1` and
 * mysteries' flat every-2-from-2nd, hence its own helper), so
 * `PsychicDisciplineDef.bonusSpells` is already keyed by the PSYCHIC level
 * that unlocks it (see `@pf1/engine` `psychic-disciplines.ts`'s doc comment)
 * — this just filters by that level and resolves each entry's vendored spell
 * id against `refData.spells` (falling back to the table's own `name`).
 *
 * These are *bonus* spells known — the tracker/builder add them to the
 * displayed known list automatically and they do NOT count against the
 * spells-known cap ("These spells are in addition to the number of spells
 * given on Table: Psychic Spells Known").
 *
 * @example
 *   disciplineSpellsKnown(ref, "faith", 5)  // → [Bless, Spiritual Weapon]
 *   disciplineSpellsKnown(ref, "faith", 0)  // → []  (no psychic levels)
 */
export function disciplineSpellsKnown(
  refData: RefData,
  disciplineTag: string | undefined,
  psychicLevel: number,
): { id: string; name: string; level: number }[] {
  if (!disciplineTag) return [];
  const discipline = PSYCHIC_DISCIPLINES[disciplineTag];
  if (!discipline) return [];
  return discipline.bonusSpells
    .filter((sp) => sp.level <= psychicLevel)
    .map((sp) => ({ id: sp.id, name: refData.spells[sp.id]?.name ?? sp.name, level: sp.level }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Shaman spirit magic bonus spells
// ---------------------------------------------------------------------------

/**
 * Shaman Spirit Magic bonus spells accessible at `shamanLevel` for the given
 * `spiritTag` (issue #65). Unlike {@link mysterySpellsKnown}'s
 * `OracleMysteryBonusSpell.level` (an ORACLE level threshold), a
 * `ShamanSpiritMagicSpell.level` is the SPELL's own level (1st-9th, per the
 * vendored per-spirit prose — see `@pf1/engine` `shaman-spirits.ts`'s doc
 * comment) — a spirit's level-N spell becomes accessible the moment the
 * shaman can cast spells of that level at all (PF1 RAW: "she has one spell
 * slot per day of each shaman spell level she can cast"), so this filters
 * against {@link accessibleSpellLevels} (the shaman caster model) rather than
 * a fixed per-spell unlock level.
 *
 * These are *bonus* spells known — the tracker/builder add them to the
 * displayed known list automatically (see `CASTER_MODELS.shaman`'s
 * `learnGuidance` for the caveat on the daily-spontaneous-cast mechanic this
 * does NOT track as a separate resource pool).
 *
 * @example
 *   shamanSpiritSpellsKnown(ref, "life", 5)  // → [Detect Undead, Lesser Restoration, Neutralize Poison]
 *   shamanSpiritSpellsKnown(ref, "life", 0)  // → []  (no shaman levels)
 */
export function shamanSpiritSpellsKnown(
  refData: RefData,
  spiritTag: string | undefined,
  shamanLevel: number,
): { id: string; name: string; level: number }[] {
  if (!spiritTag) return [];
  const spirit = SHAMAN_SPIRITS[spiritTag];
  if (!spirit) return [];
  const accessible = new Set(accessibleSpellLevels(CASTER_MODELS.shaman!, shamanLevel));
  return spirit.spiritMagicSpells
    .filter((sp) => accessible.has(sp.level))
    .map((sp) => ({ id: sp.id, name: refData.spells[sp.id]?.name ?? sp.name, level: sp.level }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Wizard specialization schools
// ---------------------------------------------------------------------------

/**
 * Wizard specialization school tag -> display label. Hand-authored (trivial;
 * the vendored Foundry data has no arcane-school display-name mapping, only
 * the bare `Spell.school` abbreviation each spell carries). The single source
 * of truth for both the builder's school/opposition pickers and the spell
 * browse filter chips.
 */
export const SCHOOL_LABELS: Record<WizardSchoolTag, string> = {
  abj: "Abjuration",
  con: "Conjuration",
  div: "Divination",
  enc: "Enchantment",
  evo: "Evocation",
  ill: "Illusion",
  nec: "Necromancy",
  trs: "Transmutation",
  uni: "Universalist",
};

/** All wizard school tags (the eight specialist schools + Universalist). */
export const SCHOOL_TAGS: WizardSchoolTag[] = [
  "abj",
  "con",
  "div",
  "enc",
  "evo",
  "ill",
  "nec",
  "trs",
  "uni",
];

/**
 * Display label for a school tag read off `Spell.school` (a bare `string` in
 * the schema, not narrowed to `WizardSchoolTag`). Falls back to the raw tag
 * for any value outside the known set (shouldn't happen with vendored data,
 * but keeps display code crash-free).
 */
export function schoolLabel(tag: string): string {
  return SCHOOL_LABELS[tag as WizardSchoolTag] ?? tag;
}

// ---------------------------------------------------------------------------
// Multiclass caster-class helpers (issue #22)
// ---------------------------------------------------------------------------

/**
 * Every class on the document that has a vendored spell list, in
 * `identity.classes` array order. A single-class caster returns a one-element
 * array; a non-caster returns `[]`. This is the one place that enumerates
 * "which classes cast spells" — everything else (the builder's class
 * switcher, the tracker panel, `primaryCasterClassTag`) should call this
 * instead of re-deriving it.
 */
export function casterClassesOf(
  doc: CharacterDoc,
  refData: RefData,
): { tag: string; level: number }[] {
  return doc.identity.classes.filter((c) => !!refData.spellLists[c.tag]);
}

/**
 * The document's *primary* caster class: the first (in `identity.classes`
 * order) class with a spell list, or `undefined` if the character casts no
 * spells at all. Legacy per-class spell state — the flat `build.spells.known`
 * list, a `PreparedSpell` with no `classTag`, and the flat
 * `live.spells.slotsUsed` — is always attributed to this class, which is what
 * makes every pre-multiclass document (and every single-caster document
 * going forward) load and behave identically with zero migration.
 */
export function primaryCasterClassTag(doc: CharacterDoc, refData: RefData): string | undefined {
  return casterClassesOf(doc, refData)[0]?.tag;
}

/**
 * The class tag to actually *store* on a new per-class record (a
 * `PreparedSpell.classTag`, a `slotsUsedByClass` key, …): `undefined` when
 * `classTag` is the primary caster class (so the record lands in the legacy
 * flat field instead of `byClass`/`slotsUsedByClass`), else `classTag`
 * unchanged. Centralizes the "primary class stays in the flat field" rule so
 * `model/doc.ts`, `model/preparedSpells.ts`, and `model/spontaneousSpells.ts`
 * don't each re-derive it.
 */
export function storedClassTag(
  doc: CharacterDoc,
  refData: RefData,
  classTag: string,
): string | undefined {
  return classTag === primaryCasterClassTag(doc, refData) ? undefined : classTag;
}

/**
 * The known-spell list for `classTag`: the flat `build.spells.known` for the
 * primary caster class, or `build.spells.byClass[classTag].known` (defaulting
 * to `[]`) for any other caster class. The only correct way to read a
 * multiclass character's spellbook — never read `doc.build.spells.known`
 * directly outside this module once more than one caster class is possible.
 */
export function knownSpellsFor(doc: CharacterDoc, refData: RefData, classTag: string): string[] {
  if (classTag === primaryCasterClassTag(doc, refData)) return doc.build.spells.known;
  return doc.build.spells.byClass?.[classTag]?.known ?? [];
}

/**
 * Write `known` as the spell list for `classTag`, routing to the flat
 * `build.spells.known` for the primary caster class or to
 * `build.spells.byClass[classTag]` otherwise. Paired with {@link knownSpellsFor}.
 */
export function setKnownSpellsFor(
  doc: CharacterDoc,
  refData: RefData,
  classTag: string,
  known: string[],
): CharacterDoc {
  if (classTag === primaryCasterClassTag(doc, refData)) {
    return { ...doc, build: { ...doc.build, spells: { ...doc.build.spells, known } } };
  }
  return {
    ...doc,
    build: {
      ...doc.build,
      spells: {
        ...doc.build.spells,
        byClass: { ...doc.build.spells.byClass, [classTag]: { known } },
      },
    },
  };
}

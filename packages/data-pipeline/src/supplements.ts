/**
 * Hand-authored supplements for content the pinned Foundry pack omits.
 *
 * `bloodlineSpellLists` is normally derived purely by inverting each spell's
 * `learnedAt.bloodline` (see `normalize.ts`). A handful of Core Rulebook
 * bloodlines are fully authored in `@pf1/engine` `BLOODLINES` (arcana +
 * powers) but have NO bonus-spell list upstream — no vendored spell ever
 * references the tag, so the inversion produces nothing and the bloodline is
 * unselectable in the builder's picker. The Aberrant bloodline is the concrete
 * case.
 *
 * This fills the gap clean-room from the published CRB (Aberrant, p. 73), the
 * same posture as `traits.ts`/`bloodlines.ts` for content the compendium
 * doesn't carry. Entries are authored by spell **name** and resolved to the
 * vendored spell id at build time (see `resolveBloodlineSupplements`); a data
 * bump that renames or drops one of these spells fails the build loudly rather
 * than silently emitting a broken list. If upstream ever starts tagging a
 * supplemented bloodline, the real derived list wins and the supplement is
 * ignored (see the merge in `normalize.ts`).
 *
 * Tests exempt these tags from the "every list entry traces back to a spell's
 * learnedAt.bloodline" invariants — see `packages/data-pipeline/test/refdata.test.ts`.
 */

import type {
  ArchetypeFeature,
  Buff,
  BuffGate,
  Change,
  Class,
  ClassFeature,
  ClassFeatureGrant,
  ContextNote,
  Domain,
  DruidDomain,
  Item,
  Race,
  RacialTrait,
  SourceRef,
  Spell,
  SpellList,
} from "@pf1/schema";

import { slug } from "./transform/common.js";

/**
 * Supplemental bonus-spell lists keyed by bloodline tag, then by spell level
 * (1–9), listing spell **names** (resolved to ids at build time). PF1 grants a
 * bloodline's level-`L` spell at sorcerer level `2L+1`.
 */
export const SUPPLEMENTAL_BLOODLINE_SPELLS: Record<string, Record<number, string[]>> = {
  // Aberrant sorcerer bloodline — CRB p. 73.
  Aberrant: {
    1: ["Enlarge Person"],
    2: ["See Invisibility"],
    3: ["Tongues"],
    4: ["Black Tentacles"],
    5: ["Feeblemind"],
    6: ["Veil"],
    7: ["Plane Shift"],
    8: ["Mind Blank"],
    9: ["Shapechange"],
  },

  /* The eleven splatbook bloodlines whose bonus spells no vendored spell
   * tags via `learnedAt.bloodline` — transcribed clean-room from each
   * bloodline's aonprd.com page, spell names matched to the vendored
   * spelling (comma-suffix convention, e.g. "Charm Monster, Mass"). */

  // Astral sorcerer bloodline — Distant Realms.
  Astral: {
    1: ["True Strike"],
    2: ["False Life"],
    3: ["Sands of Time"],
    4: ["Wandering Star Motes"],
    5: ["Permanency"],
    6: ["Contingency"],
    7: ["Ethereal Jaunt"],
    8: ["Create Demiplane"],
    9: ["Time Stop"],
  },

  // Deep Earth sorcerer bloodline — APG.
  "Deep Earth": {
    1: ["Expeditious Excavation"],
    2: ["Darkvision"],
    3: ["Shifting Sand"],
    4: ["Stoneskin"],
    5: ["Spike Stones"],
    6: ["Stone Tell"],
    7: ["Repel Metal or Stone"],
    8: ["Earthquake"],
    9: ["Clashing Rocks"],
  },

  // Naga sorcerer bloodline — Blood of the Beast.
  Naga: {
    1: ["Ray of Enfeeblement"],
    2: ["Invisibility"],
    3: ["Lightning Bolt"],
    4: ["Poison"],
    5: ["Dominate Person"],
    6: ["Veil"],
    7: ["Limited Wish"],
    8: ["Charm Monster, Mass"],
    9: ["Shapechange"],
  },

  // Phoenix sorcerer bloodline — Heroes of Golarion.
  Phoenix: {
    1: ["Color Spray"],
    2: ["See Invisibility"],
    3: ["Magic Circle against Evil"],
    4: ["Wall of Fire"],
    5: ["Break Enchantment"],
    6: ["Path of the Winds"],
    7: ["Firebrand"],
    8: ["Prismatic Wall"],
    9: ["Fiery Body"],
  },

  // Possessed sorcerer bloodline — Haunted Heroes Handbook.
  Possessed: {
    1: ["Anticipate Peril"],
    2: ["Share Memory"],
    3: ["Purge Spirit"],
    4: ["Entrap Spirit"],
    5: ["Possession"],
    6: ["Telepathy"],
    7: ["Insanity"],
    8: ["Bilocation"],
    9: ["Divide Mind"],
  },

  // Salamander sorcerer bloodline — Elemental Master's Handbook.
  Salamander: {
    1: ["Magic Weapon"],
    2: ["Molten Orb"],
    3: ["Magic Vestment"],
    4: ["Fire Shield"],
    5: ["Fire Snake"],
    6: ["Tar Pool"],
    7: ["Firebrand"],
    8: ["Wall of Lava"],
    9: ["Meteor Swarm"],
  },

  // Scorpion sorcerer bloodline — Potions & Poisons. AoN's own page has the
  // typo "vermin shap II"; the real spell is Vermin Shape II.
  Scorpion: {
    1: ["Thorn Javelin"],
    2: ["Spider Climb"],
    3: ["Poison"],
    4: ["Giant Vermin"],
    5: ["Vermin Shape II"],
    6: ["Sirocco"],
    7: ["Creeping Doom"],
    8: ["Horrid Wilting"],
    9: ["Transmute Blood To Acid"],
  },

  // Shapechanger sorcerer bloodline — Legacy of the First World.
  Shapechanger: {
    1: ["Disguise Self"],
    2: ["Alter Self"],
    3: ["Fly"],
    4: ["Beast Shape II"],
    5: ["Polymorph"],
    6: ["Transformation"],
    7: ["Polymorph, Greater"],
    8: ["Frightful Aspect"],
    9: ["Shapechange"],
  },

  // Solar sorcerer bloodline — Qadira, Jewel of the East. Level 4 is RAW
  // "shield of dawn" (Inner Sea Gods), which exists neither in the vendored
  // spell set nor on AoN's own spell index — omitted rather than guessed,
  // so that one grant (sorcerer level 9) simply shows no bonus spell.
  Solar: {
    1: ["Searing Light"],
    2: ["Fury of the Sun"],
    3: ["Daylight"],
    5: ["Flame Strike"],
    6: ["True Seeing"],
    7: ["Sunbeam"],
    8: ["Sunburst"],
    9: ["Overwhelming Presence"],
  },

  // Unicorn sorcerer bloodline — Heroes of Golarion.
  Unicorn: {
    1: ["Cure Light Wounds"],
    2: ["Cure Moderate Wounds"],
    3: ["Cure Serious Wounds"],
    4: ["Neutralize Poison"],
    5: ["Atonement"],
    6: ["Heal"],
    7: ["Restoration, Greater"],
    8: ["Cure Critical Wounds, Mass"],
    9: ["Heal, Mass"],
  },

  // Vestige sorcerer bloodline — Blood of the Ancients.
  Vestige: {
    1: ["Identify"],
    2: ["Share Memory"],
    3: ["Arcane Sight"],
    4: ["Hypercognition"],
    5: ["Telepathic Bond"],
    6: ["Analyze Dweomer"],
    7: ["Vision"],
    8: ["Discern Location"],
    9: ["Foresight"],
  },
};

/** Bloodline tags carried by the hand-authored supplement above. */
export const SUPPLEMENTAL_BLOODLINE_TAGS: ReadonlySet<string> = new Set(
  Object.keys(SUPPLEMENTAL_BLOODLINE_SPELLS),
);

/**
 * Resolve the supplemental bloodline spell names to vendored spell ids, using
 * the given name→id lookup. Throws if a named spell is absent from the vendored
 * set (a data-version drift guard). Only tags NOT already present in
 * `existing` are resolved — upstream-derived lists always win.
 */
export function resolveBloodlineSupplements(
  spellIdByName: ReadonlyMap<string, string>,
  existing: Record<string, SpellList>,
): Record<string, SpellList> {
  const out: Record<string, SpellList> = {};
  for (const [tag, byLevel] of Object.entries(SUPPLEMENTAL_BLOODLINE_SPELLS)) {
    if (existing[tag]) continue;
    const list: SpellList = {};
    for (const [lvl, names] of Object.entries(byLevel)) {
      for (const name of names) {
        const id = spellIdByName.get(name);
        if (id === undefined) {
          throw new Error(
            `[supplements] bloodline "${tag}" L${lvl}: spell "${name}" not found in vendored spells`,
          );
        }
        (list[Number(lvl)] ??= []).push(id);
      }
      list[Number(lvl)]!.sort();
    }
    out[tag] = list;
  }
  return out;
}

/**
 * Hand-authored fixes for vendored `ClassFeature.uses.maxFormula` values,
 * keyed by feature **name** (unique in the vendored slice). Applied
 * unconditionally (unlike the bloodline-spell-list supplement above, this
 * isn't a "fill only if missing" gap-fill — it corrects an
 * existing-but-incomplete or existing-but-wrong formula).
 *
 * - Grit (gunslinger, Ultimate Combat p. 9) and Panache (swashbuckler,
 *   Advanced Class Guide p. 16) are each RAW "equal to her Wisdom/Charisma
 *   modifier (minimum 1)", but the vendored formula is a bare
 *   `@abilities.wis.mod` / `@abilities.cha.mod` — for a character with a 0 or
 *   negative modifier this evaluates to <= 0, and `deriveResourcePools` drops
 *   any pool whose max evaluates to <= 0 entirely (no pool at all, instead of
 *   RAW's 1). Compare `Arcane Pool` / `Inspiration`, whose vendored formulas
 *   already bake in an equivalent `max(1, ...)` floor — this brings
 *   Grit/Panache in line with that existing pattern.
 * - Smite Evil (paladin, CRB p. 60-61) is RAW "1/day, +1 at 4th/7th/10th/
 *   13th/16th/19th [paladin level]", but the vendored formula reads
 *   `floor((@attributes.hd.total - 1) / 3) + 1` — TOTAL character Hit Dice,
 *   not paladin level. Single-classed paladins are unaffected (the two are
 *   equal), but a multiclass paladin (e.g. paladin 4/fighter 3) gets
 *   `floor((7-1)/3)+1 = 3` instead of the correct 2. Retargeted to
 *   `@class.unlevel`, the granting-class-level roll-data binding
 *   `deriveResourcePools` sets up for every class-feature-scoped
 *   `uses.maxFormula` (see `resources.ts`). (Swept every other vendored
 *   `uses.maxFormula` referencing `@attributes.hd.total`: the only other hit
 *   is Stunning Fist's `@class.unlevel + floor((@attributes.hd.total -
 *   @class.unlevel) / 4)`, which is RAW-correct as written — Stunning Fist's
 *   daily-use count genuinely scales off total character level plus a
 *   monk-level bonus, not off a single class's level alone — so it's left
 *   untouched.)
 */
export const SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA: Record<string, string> = {
  Grit: "max(1, @abilities.wis.mod)",
  Panache: "max(1, @abilities.cha.mod)",
  "Smite Evil": "floor((@class.unlevel - 1) / 3) + 1",
};

/**
 * Apply `SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA` in place to a list of
 * normalized class features (mutates `uses.maxFormula` only, on the matching
 * feature's own `uses` object — never invents a `uses` block where none
 * exists).
 */
export function applyClassFeatureUsesSupplements(features: ClassFeature[]): void {
  for (const feature of features) {
    const formula = SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA[feature.name];
    if (formula && feature.uses) {
      feature.uses = { ...feature.uses, maxFormula: formula };
    }
  }
}

/**
 * Hand-authored replacement for the brawler's "AC Bonus (BRA)" `changes[]`
 * (Advanced Class Guide p. 26), keyed by feature **name** (unique in the
 * vendored slice). RAW schedule is a +1 dodge bonus to AC/CMD at 4th level,
 * increasing by +1 at 9th, 13th, and 18th (irregular 5/4/5-level gaps — not a
 * fixed-divisor progression). The vendored formula,
 * `clamp(floor((@class.unlevel-1)/4),0,4)`, is a divisor-4 approximation that
 * lands on the right value at 5-8/10-12/14-16/19-20 but is off by one at
 * exactly 4th (reads +0, should be +1) and at 17th (reads +4 a level early —
 * RAW's +4 doesn't arrive until 18th). Replaced with explicit level-tier
 * `if`/`gte` nesting rather than a divisor, since the tier gaps aren't even;
 * the light-armor/unencumbered gate multiplier is unchanged from the vendored
 * formula.
 */
export const SUPPLEMENTAL_CLASS_FEATURE_CHANGES: Record<string, Change[]> = {
  "AC Bonus (BRA)": [
    {
      formula:
        "(if(and(lt(@armor.type, 2), lt(@attributes.encumbrance.level, 1)), 1)) * if(gte(@class.unlevel, 18), 4, if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 9), 2, if(gte(@class.unlevel, 4), 1, 0))))",
      target: "ac",
      type: "dodge",
    },
    {
      formula:
        "(if(and(lt(@armor.type, 2), lt(@attributes.encumbrance.level, 1)), 1)) * if(gte(@class.unlevel, 18), 4, if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 9), 2, if(gte(@class.unlevel, 4), 1, 0))))",
      target: "cmd",
      type: "dodge",
    },
  ],
};

/**
 * Apply `SUPPLEMENTAL_CLASS_FEATURE_CHANGES` in place, replacing the named
 * feature's whole `changes` array. Throws if a named feature is absent from
 * the vendored set — a data-drift guard, mirroring
 * `resolveBloodlineSupplements`.
 */
export function applyClassFeatureChangesSupplements(features: ClassFeature[]): void {
  const byName = new Map(features.map((f) => [f.name, f]));
  for (const [name, changes] of Object.entries(SUPPLEMENTAL_CLASS_FEATURE_CHANGES)) {
    const feature = byName.get(name);
    if (feature === undefined) {
      throw new Error(`[supplements] class feature "${name}" not found in vendored class features`);
    }
    feature.changes = changes;
  }
}

/**
 * Class features whose published text grants an unconditional immunity to
 * something that ISN'T damage — the same `immEffect.<slug>` axis as
 * `SUPPLEMENTAL_RACE_EFFECT_IMMUNITY` below (display-only plus a soft flag on
 * mapped conditions; `resolveDamage` never sees it), prose-only upstream for
 * every entry here. Slugs are the engine's closed vocabulary
 * (`EFFECT_IMMUNITY_LABELS` in `@pf1/engine` `defenses.ts`); an unknown slug
 * is silently dropped at display time, so the fixture tests assert the sheet
 * output, not just the data.
 *
 * Keyed by feature **id**, not name: unlike the uses/changes tables above,
 * several of these names are NOT unique in the vendored slice (three distinct
 * "Aura of Courage" features, three "Timeless Body"). `name` is carried for
 * readability and verified on apply, and each entry also records a `keyword`
 * that must appear in the feature's own vendored description — the same
 * drift-guard posture as `SUPPLEMENTAL_RACE_SENSES`, since every entry only
 * makes that description's own sentence machine-readable. Level gating comes
 * free: a class feature's `changes` only apply once its granting level is
 * reached (see `@pf1/engine` `collect.ts`'s per-grant loop).
 *
 * Several entries are shared by, or belong to, vendored splatbook prestige
 * classes (Asavir, Chevalier, Green Faith Acolyte, Magaambyan Arcanist) —
 * those ride along at no extra cost because the feature is the unit here,
 * not the class.
 *
 * Swept the whole vendored class-feature slice for immunity wording and
 * deliberately excluded:
 *   - Samurai's Honorable Stand (immune to shaken/frightened/panicked only
 *     WHILE making an activated resolve-fueled stand);
 *   - Spiritualist's Empowered Consciousness (conditional on the phantom
 *     being confined in her consciousness);
 *   - Antipaladin's Aura of Cowardice (strips ENEMIES' fear immunity — not a
 *     self-immunity);
 *   - Liberator's Poison Resistance (a save bonus that never becomes
 *     immunity, unlike the alchemist/investigator line, which culminates in
 *     the separate "Poison Immunity" feature included below).
 */
interface ClassFeatureEffectImmunitySupplement {
  /** Vendored feature name, verified on apply (ids are unique; names aren't). */
  name: string;
  /** `EFFECT_IMMUNITY_LABELS` slugs — the engine's vocabulary, not free text. */
  effects: readonly string[];
  /**
   * Case-insensitive substring that must appear in the feature's own
   * description (HTML-stripped) — catches both a typo here and an upstream
   * rewrite that changes what the feature actually grants.
   */
  keyword: string;
}

export const SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY: Record<
  string,
  ClassFeatureEffectImmunitySupplement
> = {
  // Paladin 3 — "is immune to all diseases, including supernatural and
  // magical diseases" (CRB, paladin).
  C5tWPm12qyz5ND9u: {
    name: "Divine Health",
    effects: ["disease"],
    keyword: "immune to all diseases",
  },
  // Paladin 3 — "is immune to fear (magical or otherwise)" (CRB, paladin).
  RNIkkvqaq2iVrahs: { name: "Aura of Courage", effects: ["fear"], keyword: "immune to fear" },
  // Asavir 3 / Chevalier 1 — each "gains an aura of courage like that of a
  // 3rd-level paladin", i.e. the fear immunity above.
  DxiQ7EiOese2Wqtu: { name: "Aura of Courage", effects: ["fear"], keyword: "aura of courage" },
  RFu1MEABBOupnzD0: { name: "Aura of Courage", effects: ["fear"], keyword: "aura of courage" },
  // Paladin 8 — "is immune to charm spells and spell-like abilities"
  // (CRB, paladin).
  jiBCmy0kP1Uwaz0D: { name: "Aura of Resolve", effects: ["charm"], keyword: "immune to charm" },
  // Paladin 17 — "immunity to compulsion spells and spell-like abilities"
  // (CRB, paladin).
  iFq0EX4yovswIox9: {
    name: "Aura of Righteousness",
    effects: ["compulsion"],
    keyword: "compulsion",
  },
  // Monk 5 / Monk (Unchained) 5 — "immunity to all diseases, including
  // supernatural and magical diseases" (CRB, monk; one shared feature).
  "82G7gl4C1AvtSHI4": { name: "Purity of Body", effects: ["disease"], keyword: "diseases" },
  // Monk 11 — "immunity to poisons of all kinds" (CRB, monk).
  nRffrQSKTqjeBAO5: { name: "Diamond Body", effects: ["poison"], keyword: "poison" },
  // Druid 9 — "immunity to all poisons" (CRB, druid).
  yzmKDxR63yS5fqlc: { name: "Venom Immunity", effects: ["poison"], keyword: "poison" },
  // Green Faith Acolyte 6 — "gains immunity to all poisons".
  N5AR6U6lJnB1WJ21: { name: "Venom Immunity", effects: ["poison"], keyword: "poison" },
  // Alchemist 10 / Investigator 11 — "becomes completely immune to poison"
  // (APG alchemist / ACG investigator; one shared feature, the culmination of Poison Resistance).
  tflIOhX6ukxtwXLx: { name: "Poison Immunity", effects: ["poison"], keyword: "immune to poison" },
  // Antipaladin 3 — "does not take any damage or take any penalty from
  // diseases" (APG, antipaladin; he can still contract and spread them — the
  // carrier nuance stays in the feature's own prose).
  jz0LkAoq9lgyZXGM: { name: "Plague Bringer", effects: ["disease"], keyword: "diseases" },
  // Druid 15 / Monk 17 / Monk (Unchained) 17 / Shifter 18 — one shared
  // feature: "cannot be magically aged" (CRB druid/monk). Already-accrued
  // penalties remaining is prose the label doesn't contradict.
  "5JlthJkVGEHPZypG": {
    name: "Timeless Body",
    effects: ["magicalAging"],
    keyword: "magically aged",
  },
  // Green Faith Acolyte 10 / Magaambyan Arcanist 10 — each "functions
  // exactly like the druid ability of the same name".
  TPrvvB6UluI4xvAH: { name: "Timeless Body", effects: ["magicalAging"], keyword: "aging" },
  "1QAyvkvu1svUPTSi": { name: "Timeless Body", effects: ["magicalAging"], keyword: "aging" },
};

/**
 * Apply `SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY` in place, appending one
 * `immEffect.<slug>` change per listed effect to the identified feature's
 * `changes`. Throws if an id is absent, its name no longer matches, or its
 * description no longer contains the recorded keyword — the drift guards
 * described in the table's doc comment.
 */
export function applyClassFeatureEffectImmunitySupplements(features: ClassFeature[]): void {
  const byId = new Map(features.map((f) => [f.id, f]));
  for (const [id, supp] of Object.entries(SUPPLEMENTAL_CLASS_FEATURE_EFFECT_IMMUNITY)) {
    const feature = byId.get(id);
    if (feature === undefined) {
      throw new Error(
        `[supplements] class feature "${supp.name}" (${id}) not found in vendored class features`,
      );
    }
    if (feature.name !== supp.name) {
      throw new Error(
        `[supplements] class feature ${id} is named "${feature.name}" upstream, not "${supp.name}" — ` +
          `the vendored content moved under this id`,
      );
    }
    const description = (feature.description ?? "").replace(/<[^>]*>/g, " ").toLowerCase();
    if (!description.includes(supp.keyword.toLowerCase())) {
      throw new Error(
        `[supplements] class feature "${supp.name}" (${id}) description no longer mentions ` +
          `"${supp.keyword}" — re-verify its immunity before trusting this supplement`,
      );
    }
    feature.changes = [
      ...feature.changes,
      ...supp.effects.map((effect) => ({
        formula: "1",
        target: `immEffect.${effect}`,
        type: "untyped",
      })),
    ];
  }
}

/**
 * Hand-authored additions to vendored `Buff.changes`/`contextNotes` that omit
 * numeric effects the published spell text actually grants, keyed by buff
 * **name** (unique in the vendored slice). Additive only — appended alongside
 * the vendored `changes`/`contextNotes`, never replacing them (unlike
 * `SUPPLEMENTAL_CLASS_FEATURE_CHANGES` above, which corrects an
 * existing-but-wrong formula rather than filling a gap).
 *
 * (Unchained Rage's own missing temp-HP grant — the same family of gap as
 * these — is NOT here: it's already patched at the engine layer, see
 * `@pf1/engine` `buff-effects.ts`'s `BUFF_CHANGE_PATCHES`. Don't re-add it
 * here — the two mechanisms would double up, both keyed by the same buff
 * name, and `computeGrantedTempHp` groups temp HP by source name, so a
 * duplicate here would render as a spurious struck-through second component
 * rather than actually double-counting the total, but it's still dead
 * weight.)
 *
 * - Divine Power (CRB p. 273): "+1 temp HP per caster level" — the vendored
 *   buff's own description already quotes this ([[@item.level]] temp. HP)
 *   but `changes[]` never encoded it. `@item.level` (not `@cl`) matches the
 *   buff's own existing changes and is bound to the same caster-level value
 *   as `@cl` for an active buff (see `collect.ts`'s `withBuffCasterLevel`).
 * - Heroism, Greater (CRB p. 295): "temp HP equal to caster level (max 20)".
 * - Stoneskin (CRB p. 350): grants DR 10/adamantine; vendored `changes` is
 *   empty. `dr.adamantine` is the engine's existing qualified-DR convention
 *   (see `defenses.ts`), already exercised by Barbarian DR / Resiliency's
 *   `dr.magic`.
 * - Aid (CRB p. 239): "1d8 + caster level" temp HP — dice-based, so it can't
 *   be a static `Change`; a context note is the honest option (same posture
 *   as judgments.ts's energy-resistance-of-choice note).
 * - Delay Poison (CRB p. 267): "temporarily immune to poison" — vendored
 *   `changes[]` was empty; now an `immEffect.poison` grant.
 * - Armor of the Tireless Warrior (Occult Adventures): suppresses the
 *   fatigued/exhausted penalties for 10 minutes. The RAW comedown when it
 *   ends (1d6 nonlethal, the condition returns) isn't a `Change` this engine
 *   has a target for, so it's a context note instead (below).
 * - Resiliency / Chaos Totem, Greater / Healing / Smiting are inquisitor-
 *   judgment and barbarian-rage-power placeholder buffs whose own vendored
 *   description already quotes an `@item.level`-driven formula
 *   (`[[1 + floor(@item.level / 5)]]` etc.) that never made it into
 *   `changes[]`. `@item.level` resolves to whatever caster level the tracker
 *   assigned the buff at activation time — BuffsPanel's search-and-add flow
 *   always uses the character's total level, same simplification Divine
 *   Power/Heroism, Greater above already rely on; a context note flags the
 *   multiclass mismatch below.
 * - Veemod (Gray) / Veemod (Orange) (Iron Gods technological visors,
 *   Technology Guide): grant low-light vision / see in darkness respectively
 *   while worn; vendored `changes[]` was empty.
 * - Force Field (Technology Guide): grants immunity to critical hits (not
 *   precision damage) regardless of the field's color tier. The temp HP and
 *   fast healing that DO vary by tier aren't dice-based but ARE
 *   tier-dependent, so they're a context note (below) rather than a guessed
 *   Change.
 * - Danger Ward (Fortitude/Will/Reflex) (cavalier Order of the Paw,
 *   Advanced Race Guide p. 64): each ward's own save reroll is a triggered ability with
 *   no bonus-value target this engine tracks, so it's context-note only.
 * - Invisibility / Invisibility, Greater (CRB p. 301): the +20 Stealth bonus
 *   while moving is a real self-applying number; the immobile +40, total
 *   concealment, the unseen-attacker riders, and the ends-on-attack rule are
 *   situational, so they're context notes.
 * - See Invisibility (CRB p. 339): grants the `sensesi` flag sense (this
 *   engine's own target, see `@pf1/engine` senses.ts), plus a note on what
 *   the spell does not reveal.
 * - Endure Elements (CRB p. 277): a binary "no Fortitude saves in the -50 to
 *   140 degrees Fahrenheit band" comfort effect with no sheet number at all —
 *   context note.
 * - Poetic Inspiration (Order of the Songbird's 8th-level ability, Heroes
 *   from the Fringe p. 14): the competence bonus equals the INSPIRING
 *   samurai/cavalier's Cha modifier, which the recipient's sheet can't know —
 *   context notes.
 * - Divine Transfer (APG p. 216): DR/evil equal to the CASTER's Cha bonus,
 *   normally cast on an ally — context note, same caster-side-number reason
 *   as Poetic Inspiration.
 * - Spirit Steed (APG p. 77, barbarian rage power): the DR/magic belongs to
 *   the barbarian's MOUNT, never this sheet — context notes, with the
 *   standard multiclass @item.level caveat.
 * - Animal Focus (Mouse) (ACG p. 28): evasion is a save-outcome rule, not a
 *   number, and this engine has no evasion model — context note.
 * - Taunting / Regenerative / Elemental Stance (Pathfinder Unchained
 *   pp. 10-12, unchained-barbarian stance rage powers; the vendored
 *   descriptions' "(UC)" suffix means Unchained, and PZO1131 is Pathfinder
 *   Unchained, not Ultimate Combat): enemy-facing bonuses, a per-round
 *   temp-HP trickle capped by unchained rage's temp HP, and a
 *   chosen-element dice rider — all context notes.
 * - Way of the Samurai (Ultimate Combat p. 21, Order of the Warrior): a
 *   roll-three-take-best window costing resolve — reroll-shaped, context
 *   note like Danger Ward.
 * - Spell Deflection (kineticist aether utility talent, Occult Adventures
 *   p. 27 — the vendored PZO9286 p. 8 citation matches no ability of this
 *   name; the 1d10-1 spell-turning mechanic matches the vendored blurb's
 *   "consumed spell levels via charges"): dice-based with no spell-turning
 *   model — context note.
 * - Seishinru, Spirit Elixir (AP #54 p. 61): roll-twice-take-better plus a
 *   conditional dice-based revival — context note.
 * - Veemod (Prismatic) (Technology Guide p. 53): x-ray vision has no
 *   counterpart in the sense list, unlike the Gray/Orange veemods — context
 *   note.
 * - Knowledgeable Strike (Cryptid Scholar) (Magic Tactics Toolbox p. 18):
 *   dice-based single-use precision damage scaling off the granting
 *   investigator's level — context note.
 */
/**
 * Resist energy's caster-level progression, clean-room from the published
 * spell: resistance 10, rising to 20 at CL 7 and 30 at CL 11. Written as a
 * capped step count rather than nested `if`s so it stays one expression.
 *
 * Deliberately NOT derived from the vendored description's own formula, which
 * steps on a 4-level cadence (`ceil((level + 1) / 4)`) and so reaches 20 at
 * CL 6 — a level early.
 */
const RESIST_ENERGY_FORMULA = "10 * min(3, 1 + floor(max(0, @item.level - 3) / 4))";

/** One `eres.<energy>` change for a per-element Resist Energy buff variant. */
function resistEnergy(energy: string): Change[] {
  return [{ formula: RESIST_ENERGY_FORMULA, target: `eres.${energy}`, type: "untyped" }];
}

/**
 * A supplement entry. Keyed by buff **id**, not name: the vendored slice has
 * two distinct buffs both called "Resistance" (the Core Rulebook cantrip's
 * +1 to saves, and a level-scaling energy resistance from another book), so a
 * name-keyed map silently collapses them and can only ever address whichever
 * one a lookup happens to find. `name` is carried alongside purely so these
 * tables stay readable, and is verified against the vendored buff on apply —
 * an opaque id that quietly stops matching after a content re-vendor is
 * exactly the kind of drift these tables need to fail loudly on.
 */
interface BuffSupplement<T> {
  name: string;
  entries: T[];
}

export const SUPPLEMENTAL_BUFF_CHANGES: Record<string, BuffSupplement<Change>> = {
  "0hRYCva2hdwUNFh6": {
    name: "Divine Power",
    entries: [{ formula: "@item.level", target: "tempHp", type: "untyped" }],
  },
  T2j3SnpatLbS32O1: {
    name: "Heroism, Greater",
    entries: [{ formula: "min(20, @item.level)", target: "tempHp", type: "untyped" }],
  },
  dYMrU01t5FNMgNra: {
    name: "Stoneskin",
    entries: [{ formula: "10", target: "dr.adamantine", type: "untyped" }],
  },
  // The per-element variants name their energy, so unlike the generic "Resist
  // Energy" buff they need no player choice and can carry a real change.
  efd99dVtQUUSoz5Z: { name: "Resist Energy (Acid)", entries: resistEnergy("acid") },
  u2g0irnJ5BeNvh0R: { name: "Resist Energy (Cold)", entries: resistEnergy("cold") },
  p8gZ2WaceSCWT4LK: {
    name: "Resist Energy (Electricity)",
    entries: resistEnergy("electricity"),
  },
  OEPLhd4m46A6QA31: { name: "Resist Energy (Fire)", entries: resistEnergy("fire") },
  tV3x332iNS0WpFf3: { name: "Resist Energy (Sonic)", entries: resistEnergy("sonic") },
  FxGQVAP3ep7xiAC4: {
    name: "Delay Poison",
    entries: [{ formula: "1", target: "immEffect.poison", type: "untyped" }],
  },
  XYly5prMmLVsLT1l: {
    name: "Armor of the Tireless Warrior",
    entries: [
      { formula: "1", target: "immEffect.fatigue", type: "untyped" },
      { formula: "1", target: "immEffect.exhaustion", type: "untyped" },
    ],
  },
  cA2R9j90XCY3mRvl: {
    name: "Resiliency",
    entries: [{ formula: "1 + floor(@item.level / 5)", target: "dr.magic", type: "untyped" }],
  },
  ebyFqTewZ1K54aBX: {
    name: "Chaos Totem, Greater",
    entries: [{ formula: "floor(@item.level / 2)", target: "dr.lawful", type: "untyped" }],
  },
  l9l2uKTWEAuTqXVq: {
    name: "Veemod (Gray)",
    entries: [{ formula: "1", target: "sensell", type: "untyped" }],
  },
  YUrObSwqLffrici4: {
    name: "Veemod (Orange)",
    entries: [{ formula: "1", target: "sensesid", type: "untyped" }],
  },
  EDreDkg4ESQIwmEd: {
    name: "Force Field",
    entries: [{ formula: "1", target: "immEffect.criticalHits", type: "untyped" }],
  },
  sIogsaNU2T2Qe3l9: {
    name: "Invisibility",
    entries: [{ formula: "20", target: "skill.ste", type: "untyped" }],
  },
  a7hnzLkLPrqRti14: {
    name: "Invisibility, Greater",
    entries: [{ formula: "20", target: "skill.ste", type: "untyped" }],
  },
  U7fqIfaTpWEcpamb: {
    name: "See Invisibility",
    entries: [{ formula: "1", target: "sensesi", type: "untyped" }],
  },
};

export const SUPPLEMENTAL_BUFF_CONTEXT_NOTES: Record<string, BuffSupplement<ContextNote>> = {
  qmwVJUZ7ZuvF3tAB: {
    name: "Aid",
    entries: [
      {
        target: "tempHp",
        text: "Also grants 1d8+CL temporary hit points — dice-based, not modeled as a static bonus; track manually.",
      },
    ],
  },
  XYly5prMmLVsLT1l: {
    name: "Armor of the Tireless Warrior",
    entries: [
      {
        target: "immEffect.fatigue",
        text: "This suppresses the fatigued and exhausted penalties rather than curing the condition. When it ends, the wearer takes 1d6 nonlethal damage and the condition returns: apply both by hand.",
      },
    ],
  },
  cA2R9j90XCY3mRvl: {
    name: "Resiliency",
    entries: [
      {
        target: "dr.magic",
        text: "At 10th level this DR's bypass type changes from magic to your alignment (chaotic, evil, good, or lawful). Shown here as DR/magic at every level: the alignment switch is not modeled.",
      },
      {
        target: "dr.magic",
        text: "This DR scales off your total character level, the level the tracker assigns when you add the buff. For a multiclass inquisitor that overstates the DR: use your inquisitor level instead when checking the number.",
      },
    ],
  },
  ebyFqTewZ1K54aBX: {
    name: "Chaos Totem, Greater",
    entries: [
      {
        target: "dr.lawful",
        text: "Requires Chaos Totem and barbarian level 10. Your weapons, including natural weapons, also count as chaotic for bypassing damage reduction: that part is not modeled.",
      },
      {
        target: "dr.lawful",
        text: "This DR scales off your total character level, the level the tracker assigns when you add the buff. For a multiclass barbarian that overstates the DR: use your barbarian level instead when checking the number.",
      },
    ],
  },
  hzu5SyhALN2TBoAe: {
    name: "Healing",
    entries: [
      {
        target: "fastHealing",
        text: "Fast healing 1 while this judgment is active, plus 1 per three inquisitor levels. Not tracked automatically: apply it by hand.",
      },
    ],
  },
  kFYQF6YT5GIO5EdP: {
    name: "Smiting",
    entries: [
      {
        target: "damage",
        text: "Your weapons count as magic for overcoming DR. At 6th level they also count as your alignment (chaotic, evil, good, or lawful) for that purpose; at 10th level they count as adamantine for overcoming DR and hardness. Not modeled numerically.",
      },
    ],
  },
  EDreDkg4ESQIwmEd: {
    name: "Force Field",
    entries: [
      {
        target: "tempHp",
        text: "Temporary hit points and fast healing both scale with the field's color: brown 5 HP and fast healing 1, black 10 and 2, white 15 and 3, gray 20 and 4, green 25 and 5, red 30 and 6, blue 35 and 7, orange 40 and 8, prismatic 60 and 10. Add your tier's pair by hand.",
      },
    ],
  },
  J197dkOWtvbSpgjF: {
    name: "Danger Ward (Fortitude)",
    entries: [
      {
        target: "fort",
        text: "May reroll a failed Fortitude save within 1 minute as an immediate action, with a +4 competence bonus on the reroll: the reroll's result stands even if it is worse. Order of the Paw grants three uses per day total, one for each save type, shared across the three Danger Wards.",
      },
    ],
  },
  QkPDtDGeFcWZe6i9: {
    name: "Danger Ward (Will)",
    entries: [
      {
        target: "will",
        text: "May reroll a failed Will save within 1 minute as an immediate action, with a +4 competence bonus on the reroll: the reroll's result stands even if it is worse. Order of the Paw grants three uses per day total, one for each save type, shared across the three Danger Wards.",
      },
    ],
  },
  zbwheXCZgoOYOYNm: {
    name: "Danger Ward (Reflex)",
    entries: [
      {
        target: "ref",
        text: "May reroll a failed Reflex save within 1 minute as an immediate action, with a +4 competence bonus on the reroll: the reroll's result stands even if it is worse. Order of the Paw grants three uses per day total, one for each save type, shared across the three Danger Wards.",
      },
    ],
  },
  sIogsaNU2T2Qe3l9: {
    name: "Invisibility",
    entries: [
      {
        target: "skill.ste",
        text: "This rises to +40 if you hold perfectly still instead of moving.",
      },
      {
        target: "ac",
        text: "You also have total concealment: attacks against you have a 50 percent miss chance regardless of the attack roll, and no one can make an attack of opportunity against you.",
      },
      {
        target: "attack",
        text: "As an unseen attacker you gain a +2 bonus on the attack roll and your target is denied its Dexterity bonus to AC. The spell ends the instant you attack a creature directly: indirect harm, such as commanding a summoned creature or triggering a trap from hiding, does not end it.",
      },
    ],
  },
  a7hnzLkLPrqRti14: {
    name: "Invisibility, Greater",
    entries: [
      {
        target: "skill.ste",
        text: "This rises to +40 if you hold perfectly still instead of moving.",
      },
      {
        target: "ac",
        text: "You also have total concealment: attacks against you have a 50 percent miss chance regardless of the attack roll, and no one can make an attack of opportunity against you.",
      },
      {
        target: "attack",
        text: "As an unseen attacker you gain a +2 bonus on the attack roll and your target is denied its Dexterity bonus to AC. Unlike regular invisibility, this spell does not end when you attack.",
      },
    ],
  },
  U7fqIfaTpWEcpamb: {
    name: "See Invisibility",
    entries: [
      {
        target: "sensesi",
        text: "You see invisible and ethereal creatures and objects within your normal sight as translucent shapes. This does not reveal illusions, let you see through opaque objects, or help you find creatures that are merely hiding or concealed.",
      },
    ],
  },
  N9I7rqVRxAi96UBn: {
    name: "Endure Elements",
    entries: [
      {
        target: "fort",
        text: "You suffer no harm from a hot or cold environment and need not attempt Fortitude saves in conditions between -50 and 140 degrees Fahrenheit. This grants no protection from fire or cold damage, nor from other environmental hazards such as smoke or lack of air.",
      },
    ],
  },
  Ql31DWosn4CcGKew: {
    name: "Poetic Inspiration",
    entries: [
      {
        target: "attack",
        text: "The songbird order's 8th-level ability, usable once per combat as a swift action. Allies within 30 feet who can hear the samurai or cavalier gain a competence bonus equal to that character's Charisma modifier on attack rolls for 1 round: enter the inspiring character's modifier by hand, not your own.",
      },
      {
        target: "wdamage",
        text: "The same 1-round competence bonus applies to weapon damage rolls: enter the inspiring character's Charisma modifier by hand, not your own.",
      },
    ],
  },
  l6s6haw5PHdNi9YD: {
    name: "Divine Transfer",
    entries: [
      {
        target: "dr.evil",
        text: "Divine Transfer is normally cast on an ally, so its numbers come from the caster's ability scores, not the recipient's. The target gains DR/evil equal to the caster's Charisma bonus for the spell's duration, and is healed by up to the caster's Constitution score in transferred hit points, never above its normal maximum. Enter the caster's numbers by hand.",
      },
    ],
  },
  qmrE4n5BsnLVQV10: {
    name: "Spirit Steed",
    entries: [
      {
        target: "dr.magic",
        text: "Requires the ferocious mount rage power and barbarian level 6. This rage power's damage reduction belongs to your mount, not to you: while you rage and are mounted, your mount gains DR/magic equal to half your barbarian level, and its natural weapons count as magic for overcoming damage reduction. Apply it to the mount, not your own sheet.",
      },
      {
        target: "dr.magic",
        text: "This scales off your total character level, the level the tracker assigns when you add the buff. For a multiclass barbarian that overstates the number: use your barbarian level instead when checking it.",
      },
    ],
  },
  qAb9TshwWpr5JDB2: {
    name: "Animal Focus (Mouse)",
    entries: [
      {
        target: "ref",
        text: "Grants evasion, as the rogue class feature: on a successful Reflex save against an effect that allows a save for half damage, you take no damage instead. It works only in light or no armor, and not while helpless. At 12th level this becomes improved evasion: you also take only half damage on a failed save. Apply it by hand when you make a Reflex save.",
      },
    ],
  },
  "43eVSSa6rSTl7ieD": {
    name: "Taunting Stance",
    entries: [
      {
        target: "ac",
        text: "An unchained barbarian stance rage power, active only while raging. Enemies gain a +4 bonus on attack and damage rolls against you while this stance is active, but every attack against you provokes an attack of opportunity from you, resolved before the provoking attack lands. Neither the enemy bonus nor the free attack of opportunity is modeled here: apply both by hand.",
      },
    ],
  },
  HdNb6j7U9qA2tnr1: {
    name: "Regenerative Stance",
    entries: [
      {
        target: "tempHp",
        text: "An unchained barbarian stance rage power, active only while raging. At the start of each of your turns you regain 1 temporary hit point for every 4 barbarian levels you have, up to 5 per round, capped at your maximum temporary hit points from rage. This recurring per-round grant is not modeled: apply it by hand each round.",
      },
    ],
  },
  v9JaHLaVkP9O36TS: {
    name: "Elemental Stance",
    entries: [
      {
        target: "wdamage",
        text: "An unchained barbarian stance rage power, active only while raging. Choose an energy type (acid, cold, electricity, or fire) when you adopt this stance. Your melee attacks deal 1 additional point of damage of that type, rising to 1d6 at 8th level, plus 1d10 more on a critical hit at 12th level, or 2d10 or 3d10 with a weapon that scores a triple or quadruple critical. The energy type is a choice and the higher tiers are dice based, so none of this is modeled: apply it by hand.",
      },
    ],
  },
  d9bDSB4JceMd6Uq9: {
    name: "Way of the Samurai",
    entries: [
      {
        target: "attack",
        text: "Once during this ability's one minute window, you may roll an attack roll, skill check, or saving throw three times and take the best result, declared before you roll. Costs one daily use of your resolve. There is no reroll model here: track the result and the daily use by hand.",
      },
    ],
  },
  "8AEPlLbeiTbQBJbV": {
    name: "Spell Deflection",
    entries: [
      {
        target: "will",
        text: "Until the start of your next turn, each time a spell that spell turning could affect targets you, roll 1d10 minus 1 and treat it as spell turning with that many spell levels remaining. Accepting 1 point of burn extends this to 10 minutes per kineticist level but caps the total at 10 spell levels deflected. This is not a saving throw: it is dice based with no spell turning model here, so track the roll and any burn spent by hand.",
      },
    ],
  },
  FzUOIQgvjpzeNnnt: {
    name: "Seishinru, Spirit Elixir",
    entries: [
      {
        target: "attack",
        text: "For 10 rounds after drinking this, roll two d20s and take the better result on every attack roll, ability check, or skill check, ending early if any roll is a natural 20. A scion of one of Minkai's five imperial families who drops below 0 hit points during that window is instead healed 5d8 plus 10 damage, which ends the elixir's other effects and can restore a recently slain character to life. Both effects are dice based with no advantage roll model here: apply them by hand.",
      },
    ],
  },
  pbyW9fpqSA3qAwmI: {
    name: "Veemod (Prismatic)",
    entries: [
      {
        target: "senses",
        text: "Grants a 20 foot band of vision through solid objects, seeing as if in normal light even without illumination. It penetrates 20 feet of cloth, wood, or similar material, 10 feet of stone, and 10 inches of iron, steel, copper, or brass, but not lead, gold, platinum, plutonium, or skymetals. It can also scan up to 100 square feet in 1 round and locates secret compartments 90 percent of the time. Costs 1 charge per round from the goggles; no special sense here models seeing through solid objects, so track both by hand.",
      },
    ],
  },
  xpyNffVwG9jHIJNO: {
    name: "Knowledgeable Strike (Cryptid Scholar)",
    entries: [
      {
        target: "wdamage",
        text: "While this buff is active, your next successful unarmed, natural, or weapon attack against the monster kind the cryptid scholar identified deals extra precision damage: 1d6 per 4 investigator levels of the cryptid scholar who granted it, to a maximum of 5d6. It is not multiplied on a critical hit and does not apply against a creature with concealment or one immune to sneak attack, and a ranged attack only benefits within 30 feet of the target. This is dice based, so it is not modeled as a Change: apply it by hand on your next hit.",
      },
    ],
  },
};

/**
 * Apply `SUPPLEMENTAL_BUFF_CHANGES`/`SUPPLEMENTAL_BUFF_CONTEXT_NOTES` in
 * place, appending to each identified buff's existing `changes`/`contextNotes`.
 * Throws if an id is absent from the vendored set, or if the vendored buff's
 * name no longer matches the one recorded here — data-drift guards mirroring
 * `resolveBloodlineSupplements`.
 */
export function applyBuffSupplements(buffs: Buff[]): void {
  const byId = new Map(buffs.map((b) => [b.id, b]));

  const resolve = <T>(id: string, supp: BuffSupplement<T>): Buff => {
    const buff = byId.get(id);
    if (buff === undefined) {
      throw new Error(`[supplements] buff "${supp.name}" (${id}) not found in vendored buffs`);
    }
    if (buff.name !== supp.name) {
      throw new Error(
        `[supplements] buff ${id} is named "${buff.name}" upstream, not "${supp.name}" — ` +
          `the vendored content moved under this id`,
      );
    }
    return buff;
  };

  for (const [id, supp] of Object.entries(SUPPLEMENTAL_BUFF_CHANGES)) {
    const buff = resolve(id, supp);
    buff.changes = [...buff.changes, ...supp.entries];
  }
  for (const [id, supp] of Object.entries(SUPPLEMENTAL_BUFF_CONTEXT_NOTES)) {
    const buff = resolve(id, supp);
    buff.contextNotes = [...buff.contextNotes, ...supp.entries];
  }
}

/**
 * Hand-authored fixed energy resistances for the six planetouched races,
 * prose-only upstream (races.json carries no mechanical `eres.*` changes for
 * any race). Values per the published Bestiary/Advanced Race Guide entries:
 * Aasimar acid/cold/electricity 5, Tiefling cold/electricity/fire 5, and the
 * four elemental-scion kineticist-adjacent races (Ifrit/Oread/Sylph/Undine)
 * 5 against their own element (fire/acid/electricity/cold respectively).
 * `eres.<energy>` is the engine's own convention for a qualified energy-
 * resistance `Change` (see `targets.ts`/`defenses.ts`) — already exercised by
 * several archetype-extracted entries and sorcerer/bloodrager bloodlines, so
 * this rides an existing, tested consumer rather than a new one. Deliberately
 * excludes the generic Resist Energy / Protection From Energy spell buffs,
 * which need a player-chosen element neither this table nor a `Change` has a
 * way to record; the per-element Resist Energy variants, which do name their
 * energy, are covered in `SUPPLEMENTAL_BUFF_CHANGES`.
 */
export const SUPPLEMENTAL_RACE_ENERGY_RESISTANCE: Record<string, readonly string[]> = {
  Aasimar: ["acid", "cold", "electricity"],
  Tiefling: ["cold", "electricity", "fire"],
  Ifrit: ["fire"],
  Oread: ["acid"],
  Sylph: ["electricity"],
  Undine: ["cold"],
};

/**
 * Apply `SUPPLEMENTAL_RACE_ENERGY_RESISTANCE` in place, appending one
 * `eres.<energy>` change per listed energy type to the matching race's
 * `changes`. Throws if a named race is absent from the vendored slice — a
 * data-drift guard, mirroring `resolveBloodlineSupplements`.
 */
export function applyRaceEnergyResistanceSupplements(races: Race[]): void {
  const byName = new Map(races.map((r) => [r.name, r]));
  for (const [name, energies] of Object.entries(SUPPLEMENTAL_RACE_ENERGY_RESISTANCE)) {
    const race = byName.get(name);
    if (race === undefined) {
      throw new Error(`[supplements] race "${name}" not found in vendored races`);
    }
    race.changes = [
      ...race.changes,
      ...energies.map((energy) => ({ formula: "5", target: `eres.${energy}`, type: "untyped" })),
    ];
  }
}

/**
 * Racial immunities to things that AREN'T damage — the axis
 * `resolveDamage` has no place for (it reduces damage; these gate effects).
 * Prose-only upstream: every one of these is stated in the race's own
 * description and in nothing structured, so the sheet couldn't show them.
 *
 * `immEffect.<slug>` is the counterpart to the existing `imm.<damageType>`
 * target, deliberately a separate prefix so damage resolution's immunity set
 * can't be polluted with qualifiers it would never match anyway (see
 * `defenses.ts`). Slugs are the engine's own vocabulary
 * (`EFFECT_IMMUNITY_LABELS` in `@pf1/engine`'s `defenses.ts`), not free text.
 *
 * Each entry quotes the published wording it comes from, since "immune to X"
 * and "not subject to X" and "can't become X" all appear and all mean the
 * same thing mechanically. Deliberately excluded: the plant/leshy-type races
 * (Ghoran, Vine Leshy), whose prose exists specifically to say they LACK the
 * type's usual immunities, and Ganzi's Entropic Flesh, which is one outcome
 * of a lineage roll rather than a trait every ganzi has.
 */
export const SUPPLEMENTAL_RACE_EFFECT_IMMUNITY: Record<string, readonly string[]> = {
  // "Elves are immune to magic sleep effects..." (Elven Immunities)
  Elf: ["magicSleep"],
  "Half-Elf": ["magicSleep"],
  "Aquatic Elf": ["magicSleep"],
  Drow: ["magicSleep"],
  "Drow Noble": ["magicSleep"],
  // "Duergar are immune to paralysis, phantasms, and poison." (Duergar Immunities)
  Duergar: ["paralysis", "phantasms", "poison"],
  // "...are not subject to fatigue or exhaustion, and are immune to disease
  // and sleep effects" + "are immune to fear effects and all emotion-based
  // effects" (Constructed / Emotionless)
  Android: ["disease", "sleep", "fatigue", "exhaustion", "fear", "emotion"],
  // "...the being of Ib is immune to precision damage (such as sneak attacks)
  // and critical hits."
  "Being of Ib": ["criticalHits", "precisionDamage"],
  // "Shabti can't become undead." / duskwalkers are "immune to all abilities
  // that would transform their bodies or souls into undead."
  Shabti: ["undeath"],
  Duskwalker: ["undeath"],
  // "...they gain no benefit or penalty from aging and are immune to magical
  // aging effects." (Long-Lived)
  Yaddithian: ["magicalAging"],
};

/**
 * Apply `SUPPLEMENTAL_RACE_EFFECT_IMMUNITY` in place, appending one
 * `immEffect.<slug>` change per listed effect to the matching race's
 * `changes`. Throws if a named race is absent from the vendored slice — the
 * same data-drift guard `applyRaceEnergyResistanceSupplements` uses.
 */
export function applyRaceEffectImmunitySupplements(races: Race[]): void {
  const byName = new Map(races.map((r) => [r.name, r]));
  for (const [name, effects] of Object.entries(SUPPLEMENTAL_RACE_EFFECT_IMMUNITY)) {
    const race = byName.get(name);
    if (race === undefined) {
      throw new Error(`[supplements] race "${name}" not found in vendored races`);
    }
    race.changes = [
      ...race.changes,
      ...effects.map((effect) => ({
        formula: "1",
        target: `immEffect.${effect}`,
        type: "untyped",
      })),
    ];
  }
}

/**
 * Hand-authored additions for a domain's granted power the pinned Foundry
 * pack has no document for at all — unlike every other gap this module
 * fills, there's no vendored entity to correct or extend, so the whole
 * `ClassFeature` is authored here from scratch.
 *
 * - Destruction domain (Core Rulebook p. 43) grants two powers, Destructive
 *   Smite (1st) and Destructive Aura (8th); only Destructive Smite exists as
 *   a `class-abilities` document in the pinned pack, so `Domain.features`
 *   resolves to a single entry and the 8th-level power never appears.
 *   Written clean-room from the published rule (not copied from Foundry's
 *   own system scripts): a 30-foot aura, active for a number of rounds per
 *   day equal to cleric level (rounds need not be consecutive), granting a
 *   morale bonus on damage equal to half cleric level to every attack made
 *   against a target within it (including the cleric's own) and
 *   auto-confirming every critical threat rolled there. Three subdomains
 *   (Catastrophe, Hatred, Rage) name Destructive Aura as the power they
 *   displace (`transform/subdomainPowers.ts`'s `replaces` field, parsed from
 *   the Pf Data 1e source's own `replace="..."` property) — until this power
 *   exists in `Domain.features`, that displacement is a no-op, and each of
 *   those three subdomains comes out right only because there was nothing
 *   there yet to remove.
 * - Glory domain's granted-powers preamble (Core Rulebook p. 44) reads "when
 *   you channel positive energy to harm undead creatures, the save DC to
 *   halve the damage is increased by 2" — a real bonus with no
 *   `class-abilities` document either (Foundry links only Touch of Glory and
 *   Divine Presence), so it's authored here the same way. `changes: []`:
 *   Channel Energy's save DC is a single feature-wide `dcFormula` this engine
 *   evaluates directly off vendored data, with no per-source-modifier target
 *   to wire a +2 onto, so this stays prose-only rather than inventing a
 *   mechanism. The Hubris and Legend subdomains each name "the channel boost
 *   ability of the Glory domain" as what they displace — same displacement
 *   mechanics as Destructive Aura above, and the same reason this entry has
 *   to exist before that displacement can do anything.
 *
 * Synthetic id/uuid follow the same non-Foundry-shaped posture as the
 * prestige-class supplement below: a `domain:` id prefix and `domain-feature:`
 * uuid scheme that can never collide with a real Foundry id or
 * `Compendium....` uuid.
 */
export const SUPPLEMENTAL_DOMAIN_FEATURES: Record<
  string,
  { slug: string; name: string; abilityType?: string; level: number; description: string }[]
> = {
  Destruction: [
    {
      slug: "destructive-aura",
      name: "Destructive Aura",
      abilityType: "su",
      level: 8,
      description:
        "<p>You can emit a 30-foot aura of destruction for a number of rounds per day equal to your cleric level; these rounds need not be consecutive. Every attack made against a creature within the aura, including your own, gains a morale bonus on damage rolls equal to half your cleric level, and every critical threat rolled within the aura is automatically confirmed as a critical hit.</p>",
    },
  ],
  Glory: [
    {
      slug: "channel-boost",
      name: "Channel Boost",
      abilityType: "su",
      level: 0,
      description:
        "<p>When you channel positive energy to harm undead creatures, the save DC to halve the damage is increased by 2. Channel Energy's save DC shown elsewhere on the sheet has no per-source modifier to add this to automatically: apply the +2 by hand when channeling against undead.</p>",
    },
  ],
};

/**
 * Apply `SUPPLEMENTAL_DOMAIN_FEATURES` in place: pushes one `ClassFeature`
 * per listed power and appends a resolved `ClassFeatureGrant` for it to the
 * matching domain's `features`. Must run before subdomain granted-power
 * resolution (`applySubdomainPowerSupplements`), which reads a parent
 * domain's `features` to compute what a subdomain displaces. Throws on an
 * unknown domain tag or an id collision — the same drift/collision guards
 * every other supplement in this module uses.
 */
export function applyDomainFeatureSupplements(
  domains: Domain[],
  classFeatures: ClassFeature[],
): void {
  const byTag = new Map(domains.map((d) => [d.tag, d]));
  const featureIds = new Set(classFeatures.map((f) => f.id));
  for (const [tag, powers] of Object.entries(SUPPLEMENTAL_DOMAIN_FEATURES)) {
    const domain = byTag.get(tag);
    if (domain === undefined) {
      throw new Error(`[supplements] domain "${tag}" not found in vendored domains`);
    }
    for (const power of powers) {
      const id = `domain:${slug(tag)}:${power.slug}`;
      if (featureIds.has(id)) {
        throw new Error(`[supplements] duplicate domain power feature id: ${id}`);
      }
      featureIds.add(id);
      const uuid = `domain-feature:${slug(tag)}:${power.slug}`;
      classFeatures.push({
        id,
        name: power.name,
        uuid,
        description: power.description,
        ...(power.abilityType ? { abilityType: power.abilityType } : {}),
        subType: "classFeat",
        changes: [],
        grantsBuffs: [],
      });
      domain.features = [
        ...domain.features,
        { level: power.level, uuid, featureId: id, name: power.name, resolved: true },
      ].sort((a, b) => a.level - b.level);
    }
  }
}

/**
 * Hand-authored granted powers for the 25 druid nature-bond domains
 * (`class-abilities/domains/druid-domains/{animal,terrain}-domains/*.yaml`)
 * — issue #117. Unlike every cleric domain gap this module fills, the
 * Foundry pack carries NO structured `class-abilities` document for a druid
 * domain power at all: every one is free-text prose under the domain's own
 * description (see `DruidDomain` doc comment in `@pf1/schema`), so there is
 * nothing to resolve, correct, or extend — the whole `ClassFeature` catalog
 * below is authored from scratch, clean-room from the published rule
 * (Ultimate Magic for the bulk of the animal/terrain domains; a handful of
 * splatbook domains cite their own sourcebook, matched to each `DruidDomain`'s
 * own vendored `sources` at apply time). Reuses the vendored description
 * prose already sitting on each domain doc and shown as-is in the builder's
 * picker (`DruidDomainPicker`) as its basis, split at each named power's own
 * paragraph and re-keyed by level — not a transcription from any GPL'd
 * Foundry system script.
 *
 * Every domain grants exactly two named powers (a 1st-level one and a
 * higher-level one) EXCEPT three: Badlands (Subsistence 1st, Wasteland
 * Stride 2nd, Badlands Spirit 8th), Ruins (Ruin Touch 1st, Remembrance 4th,
 * Surefooted 8th), and Crocodile (Familiar and Death Roll both 1st, Ambush
 * 6th) — all three genuinely grant a third named power at their own stated
 * level, not a parsing artifact. The four Plane of Air/Earth/Fire/Water
 * domains each end their higher-level power with an "Alternatively, you can
 * choose to gain a Small <element> elemental as a familiar..." paragraph —
 * folded into that SAME power's description (not a third power) since it's
 * an either-or option on the one granted ability, not an independent grant.
 *
 * Wolf is the one exception to "every power is prose": its 1st-level power
 * ("Improved Trip: You gain Improved Trip as a bonus feat") is a fixed feat
 * grant, so it's carried via `DRUID_DOMAIN_BONUS_FEAT_CHANGES` below (a
 * `bonusFeats` `Domain.changes`-shaped entry) and the web layer's
 * `apps/web/src/model/feats.ts`, the same path Darkness/Rune's cleric-domain
 * bonus feats use — NOT a `features` entry here. Wolf's OTHER power (Pack
 * Tactics, 8th) is ordinary prose and goes through the table below like any
 * other domain's.
 *
 * Badlands' Wasteland Stride explicitly says "This replaces woodland
 * stride" (the druid's own 2nd-level class feature) — that swap isn't
 * modeled (no mechanism here removes/replaces a base class feature the way
 * an archetype swap does), so a Badlands druid's sheet shows both Woodland
 * Stride and Wasteland Stride rather than one replacing the other. Prose is
 * accurate either way; only the redundant display is a known simplification.
 */
export const SUPPLEMENTAL_DRUID_DOMAIN_FEATURES: Record<
  string,
  { name: string; abilityType?: string; level: number; description: string }[]
> = {
  Aquatic: [
    {
      name: "Sealord",
      abilityType: "su",
      level: 1,
      description:
        "<p>You can channel energy (as a cleric of your druid level) a number of times per day equal to 3 + your Charisma modifier, but only to heal creatures with the aquatic or water subtype or to command them (similar to using the Command Undead feat against undead). You can take other feats to add to this ability, such as Extra Channel and Improved Channel, but not feats that alter this ability, such as Elemental Channel and Alignment Channel. The DC to save against this ability is equal to 10 + 1/2 your druid level + your Charisma modifier.</p>",
    },
    {
      name: "Seastrike",
      abilityType: "su",
      level: 6,
      description:
        "<p>At 6th level, as a free action, you may use natural and manufactured weapons in water as if you had continuous freedom of movement. As a standard action, you can throw a weapon underwater without the normal penalties for throwing weapons; if your target is in or under the water, the weapon also acts as a returning weapon for that attack.</p>",
    },
  ],
  Arctic: [
    {
      name: "Call Cold",
      abilityType: "su",
      level: 1,
      description:
        "<p>You can channel energy (as a cleric of your druid level) a number of times per day equal to 3 + your Charisma modifier, but only to heal creatures with the cold subtype or to command them (similar to using the Command Undead feat against undead). You can take other feats that add to this ability, such as Extra Channel and Improved Channel, but not feats that alter this ability, such as Elemental Channel and Alignment Channel. The DC to save against this ability is equal to 10 + 1/2 your druid level + your Charisma modifier.</p>",
    },
    {
      name: "Banish Flame",
      abilityType: "su",
      level: 6,
      description:
        "<p>At 6th level, you may use your call cold ability to damage creatures with the fire subtype (as a cleric channeling negative energy) or to cause them to flee from you (as the Turn Undead feat). Alternatively, you may use this ability to negate magical fire effects as if using a targeted dispel magic; at 12th level, this functions as targeted or area greater dispel magic instead of dispel magic.</p>",
    },
  ],
  Badlands: [
    {
      name: "Subsistence",
      abilityType: "ex",
      level: 1,
      description:
        "<p>You can survive on very little food or water while helping others survive in harsh climates. When determining how long you can withstand starvation and thirst, including checks to avoid nonlethal damage, treat your Constitution score as though it were 10 points higher. Additionally, you gain a bonus equal to one half your druid level (minimum 1) on Survival checks in dry hills or desert terrain.</p>",
    },
    {
      name: "Wasteland Stride",
      abilityType: "ex",
      level: 2,
      description:
        "<p>At 2nd level, you may move through light or dense rubble, as well as up or down steep slopes, at your normal speed without suffering any impairment. Areas that have been magically manipulated to impede motion still affect you, however. This replaces woodland stride.</p>",
    },
    {
      name: "Badlands Spirit",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level, whenever you use wild shape to take on the form of an earth elemental, you also gain the following spell-like abilities, depending on your druid class level: geyser (8th); sirocco (12th), scouring winds (15th). Each spell-like ability is usable once per day.</p>",
    },
  ],
  Cave: [
    {
      name: "Cavesight",
      abilityType: "sp",
      level: 1,
      description:
        "<p>You can grant darkvision 60 feet to a willing creature you touch. This effect lasts 1 minute, or 1 hour if used on yourself. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Tremorsense",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you gain tremorsense 30 feet. At 12th level, you gain tremorsense 60 feet.</p>",
    },
  ],
  Crocodile: [
    {
      name: "Familiar",
      level: 1,
      description:
        "<p>You gain a dwarf caiman familiar (Pathfinder Player Companion: Animal Archive, Pathfinder Adventure Path #55). Your effective wizard level for this ability is equal to your druid level. Your druid level stacks with levels from other classes that grant familiars when determining the powers of your familiar.</p>",
    },
    {
      name: "Death Roll",
      abilityType: "ex",
      level: 1,
      description:
        "<p>While grappling an enemy up to one size category larger than you, you may make a grapple check to roll wildly, knocking your enemy prone and dealing 1d8 points of damage. When using this ability, you gain a bonus to your CMB equal to one half your druid level (minimum 1). You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Ambush",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you gain sneak attack +1d6. This increase to sneak attack damage stacks with sneak attack damage you may have from other sources. This sneak attack damage increases by +1d6 for every 5 druid levels you possess beyond 6th, to a maximum of +3d6 at 16th level.</p>",
    },
  ],
  Desert: [
    {
      name: "Heat Shimmer",
      abilityType: "su",
      level: 1,
      description:
        "<p>As a free action, you can surround yourself with heat distortion that acts as the blur spell. Creatures that strike you in melee while you're using this ability are dazzled for 1 round (Fortitude negates). You may use this ability for a number of rounds per day equal to 3 + your Wisdom modifier. These rounds need not be consecutive.</p>",
    },
    {
      name: "Servant of the Sands",
      abilityType: "sp",
      level: 8,
      description:
        "<p>At 8th level, once per day, you may call upon the aid of a janni as if using lesser planar ally. At 12th level, you may call upon the aid of any type of common (non-noble) genie as if using planar ally. At 16th level, you may call upon the aid of a noble genie as if using greater planar ally. If you use this power while in desert terrain, you need not make an offering to call the creature(s), and the cost of any service is halved.</p>",
    },
  ],
  Eagle: [
    {
      name: "Hawkeye",
      abilityType: "su",
      level: 1,
      description:
        "<p>As a swift action, you may add a bonus equal to half your druid level (minimum +1) on one ranged attack or on one Perception check. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Aerial evasion",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you gain the evasion ability (as a rogue) when you are flying. At 12th level, you gain improved evasion while flying.</p>",
    },
  ],
  Erosion: [
    {
      name: "Rusting Touch",
      abilityType: "su",
      level: 1,
      description:
        "<p>You can cause an opponent’s metal armor or weapon to become dry and brittle as it magically corrodes and rusts. You make a melee touch attack against a creature wearing metal armor or wielding a metal weapon. If you hit, choose a metal weapon, suit of metal armor, or metal shield carried or worn by that creature. The object takes an amount of hit point damage equal to 1d6 + half your druid level. If the item is not magical, or if your caster level is greater than the item’s caster level, this damage bypasses the item’s hardness. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Erosion Aura",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level, you can project an aura of magically enhanced erosion as a standard action. Objects made primarily of metal or stone within this aura lose 10 points of hardness. Magic items retain a minimum hardness equal to twice their enhancement bonus and can attempt a Fortitude saving throw (DC = 10 + half your druid level + your Wisdom modifier) to negate this effect. A construct made primarily of metal or stone must succeed at a Fortitude save or lose all damage reduction and hardness for 1 round. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
  ],
  Frog: [
    {
      name: "Sticky Strike",
      abilityType: "su",
      level: 1,
      description:
        "<p>As a standard action, you can attempt a ranged touch attack with a sticky tendril against a target up to 15 feet away, then use the pull universal monster ability to pull the target 5 feet toward you. You gain a bonus on the pull's combat maneuver check equal to 1/2 your druid level. If the target is larger than you, you may pull yourself 5 feet toward the target without making a check. The target can remove the tendril by making an opposed Strength check as a standard action, or by dealing enough slashing damage to the tendril (hit points equal to your druid level, Armor Class equal to your touch Armor Class). You can dissolve the tendril as a free action. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Webfoot",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you gain the amphibious special quality and a swim speed equal to your land speed. At 12th level, you gain a climb speed equal to your land speed.</p>",
    },
  ],
  Jungle: [
    {
      name: "Brachiation",
      abilityType: "ex",
      level: 1,
      description:
        "<p>As a free action for a number of rounds per day equal to your druid level, you may climb with a climb speed equal to your land speed, and gain a bonus on Acrobatics checks equal to your druid level. These rounds do not have to be consecutive.</p>",
    },
    {
      name: "Trap Sense",
      abilityType: "ex",
      level: 3,
      description:
        "<p>At 3rd level, you gain the trap sense ability. This is identical to the rogue class ability. Your effective rogue level is equal to your druid level for the purpose of determining your trap sense bonus. Trap sense bonuses gained from multiple classes stack.</p>",
    },
  ],
  Monkey: [
    {
      name: "Monkey Athletics",
      abilityType: "su",
      level: 1,
      description:
        "<p>As a free action, you may add a competence bonus equal to half your druid level (minimum of +1) on one Acrobatics, Climb, Disable Device, or Sleight of Hand check. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Ranged Legerdemain",
      abilityType: "su",
      level: 6,
      description:
        "<p>At 6th level, you can use the Disable Device and Sleight of Hand skills at a range of 30 feet. Working at a distance increases the normal skill check DC by 5, and you cannot take 10 on this check. Any object to be manipulated must weigh 5 pounds or less. You can only use this ability if you have at least 1 rank in the skill being used.</p>",
    },
  ],
  Mountain: [
    {
      name: "Foothold",
      abilityType: "su",
      level: 1,
      description:
        "<p>As a standard action, you can cause an adjacent stone surface up to 10 feet square to mold itself into ridges and creases. A foothold that is created on a horizontal surface is treated as difficult terrain, and a Medium or smaller creature standing in the area or moving through it takes a –2 penalty on Acrobatics checks and to CMD due to poor footing. A foothold that is created on a vertical surface grants a +10 bonus on Climb checks to climb it. The stone remains altered for 1 hour. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Thin Air",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level, as a free action, you can surround yourself with a 5-foot aura of supernaturally thin air that draws the breath from creatures adjacent to you. Creatures beginning their turn in the aura are fatigued (Fortitude negates). A fatigued creature that begins its turn in the aura must save or suffer from altitude sickness, taking 1 point of ability damage to all ability scores. At 16th level, the aura increases to 10 feet. Creatures that do not breathe are immune to this aura. You can use this ability for a number of rounds per day equal to your druid level; the rounds need not be consecutive.</p>",
    },
  ],
  Panther: [
    {
      name: "Hunter's Senses",
      abilityType: "ex",
      level: 1,
      description:
        "<p>You gain the ability to augment your senses on command. As a standard action, you grant yourself the scent special ability and improved vision. If you have normal vision, you gain low-light vision. If you have low-light vision, you gain darkvision out to a range of 30 feet. If you have darkvision, the range of your darkvision increases by 30 feet. You may use this ability a number of minutes per day equal to your druid level, in 1 minute increments. Dismissing these augmented senses is a free action.</p>",
    },
    {
      name: "Move in Darkness",
      abilityType: "ex",
      level: 8,
      description:
        "<p>At 8th level, in areas of normal or magical darkness, you gain a +2 bonus on Stealth skill checks and initiative checks for every 4 druid levels you possess, to a maximum bonus of +10 at 20th level.</p>",
    },
  ],
  Plains: [
    {
      name: "Migrating Herd",
      abilityType: "su",
      level: 1,
      description:
        "<p>When you summon an aurochs, bison, elephant, horse, mastodon, pony, or similar quadruped herbivore with a summoning spell, the duration of the spell is increased by 100% (this does not stack with Extend Spell). The creature's land speed is increased by 10 feet.</p>",
    },
    {
      name: "Pounce",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you may use the pounce special attack once per day. You may pounce one additional time per day for every 3 levels after 6th.</p>",
    },
  ],
  "Plane of Air": [
    {
      name: "Aerial Agility",
      abilityType: "ex",
      level: 1,
      description:
        "<p>You can navigate the air unhindered. As a free action, you automatically succeed at your Wisdom check to change your direction in an area of subjective gravity, and you can increase or decrease your falling speed by 10 feet per druid level during the first round after you change the direction of gravity. When you are in areas of light, normal, or heavy gravity, activating this ability instead grants you a bonus equal to your druid level on Fly checks and Acrobatics checks to jump for a number of rounds equal to your Wisdom modifier. You can use this ability a number of times equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Wind Savant",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level, you treat the penalties from natural or magical wind effects as two steps less severe. In addition, you are surrounded by a cushion of air that grants you a bonus equal to 1/2 your druid level on saving throws against gases, gaseous breath weapons, inhaled poisons, and similar effects.</p><p>Alternatively, you can choose to gain a Small air elemental as a familiar, as if you possessed the Improved Familiar feat. Your effective wizard level for this ability is equal to your druid level and stacks with other classes that grant a familiar.</p>",
    },
  ],
  "Plane of Earth": [
    {
      name: "Spelunker",
      abilityType: "su",
      level: 1,
      description:
        "<p>You ably clamber through underground areas. As a free action, you can ignore difficult terrain from stony surfaces, you take no penalties for squeezing through rocky areas, and you gain damage reduction 5/— against rocky hazards such as spike growth. This effect lasts for 1 round, and you can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "One with the Stone",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level as a swift action, you gain the earth glide universal monster ability (Bestiary 2 296) with a speed equal to your base speed. You can breathe normally while using this ability. You can use this ability for a number of rounds per day equal to your druid level, and these rounds don’t need to be consecutive.</p><p>Alternatively, you can choose to gain a Small earth elemental as a familiar, as if you possessed the Improved Familiar feat. Your effective wizard level for this ability is equal to your druid level and stacks with other classes that grant a familiar.</p>",
    },
  ],
  "Plane of Fire": [
    {
      name: "Fire Hardened",
      abilityType: "ex",
      level: 1,
      description:
        "<p>You ignore fire damage from the fire-dominant planar trait, and you gain fire resistance 5. If you have natural fire resistance, it increases by 5 instead, and if you are naturally immune to fire, you heal hit points and ability damage at twice the normal rate when resting on a fire-dominant plane. You can touch a willing creature to grant these benefits for 1 hour. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "All-Consuming Flames",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level, you can channel the extraplanar heat into your allies’ weapons within 30 feet as a standard action. For 1 minute, the affected weapons gain the cold-outsider-bane, fire-outsider-bane, or flaming weapon special abilities. You must grant each weapon the same ability, and this ability affects no more than two of any ally’s weapons. You can use this ability once per day, plus an additional time per day for every four levels beyond 8th.</p><p>Alternatively, you can choose to gain a Small fire elemental as a familiar, as if you possessed the Improved Familiar feat. Your effective wizard level for this ability is equal to your druid level and stacks with other classes that grant a familiar.</p>",
    },
  ],
  "Plane of Water": [
    {
      name: "Aquatic Veil",
      abilityType: "su",
      level: 1,
      description:
        "<p>As a standard action, you can sheathe your body in a thin layer of water for a number of rounds equal to your Wisdom modifier. This grants you a bonus on Swim checks equal to 1/2 your druid level and allows you to breathe normally underwater. You can end the effect when delivering a touch spell to create a pseudopod of water that extends your effective reach by 5 feet for that attack. When used underwater, the pseudopod instead increases your reach by 10 feet. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Hydraulic Crush",
      abilityType: "sp",
      level: 8,
      description:
        "<p>At 8th level, you can strike an area with a pressurized blast of water in a 5-foot-radius column 30 feet tall with a range of 60 feet. Creatures in the area take 1d6 bludgeoning damage per druid level and are knocked prone. When used underwater, the radius and height double, and the effect instead creates a powerful eddy that causes affected creatures to lose their Dexterity bonus to Armor Class for 1 round instead of knocking them prone. A successful Reflex save halves the damage and prevents the secondary effect. You can use this ability once per day, plus an additional time for every 6 levels beyond 8th.</p><p>Alternatively, you can choose to gain a Small water elemental as a familiar, as if you possessed the Improved Familiar feat. Your effective wizard level for this ability is equal to your druid level and stacks with other classes that grant a familiar.</p>",
    },
  ],
  Ruins: [
    {
      name: "Ruin Touch",
      abilityType: "su",
      level: 1,
      description:
        "<p>You can strengthen or weaken objects with your touch. With a melee touch attack, you can increase or decrease the hardness of an object (up to a 10-foot cube) or construct by an amount equal to half your druid level (minimum 1) for 1 minute. You cannot reduce an object’s hardness below 0, and the same target cannot be affected by this ability more than once. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Remembrance",
      abilityType: "sp",
      level: 4,
      description:
        "<p>At 4th level, when within a ruin or other structure that is no longer claimed by civilization, you can call upon the wisdom of the land and its long-dead residents. Once per day for every 4 druid levels you possess, you can cast divination as a spell-like ability. Additionally, if you are within ruins when you cast commune with nature, you gain information about the crumbling structures around you as though they were part of nature.</p>",
    },
    {
      name: "Surefooted",
      abilityType: "ex",
      level: 8,
      description:
        "<p>At 8th level, your speed is not reduced by difficult terrain unless the terrain has been magically manipulated to impede motion.</p>",
    },
  ],
  Serpent: [
    {
      name: "Slither",
      abilityType: "ex",
      level: 1,
      description:
        "<p>As a free action, you can distend and stretch your body to fit easily through narrow spaces for 1 round. You can move freely through a tight space that would normally require a creature of your size to squeeze through. While slithering, you gain a +2 dodge bonus to Armor Class against attacks of opportunity provoked by your movement and a +2 bonus on CMB and on Escape Artist checks made to escape from a grapple. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Venom Immunity",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you gain immunity to poisons from snakes, reptiles, and creatures with the reptilian subtype. At 12th level, you gain immunity to all poisons. This replaces venom immunity.</p>",
    },
  ],
  Swamp: [
    {
      name: "Natural Healing",
      abilityType: "su",
      level: 1,
      description:
        "<p>You can channel energy (as a cleric of your druid level) a number of times per day equal to 3 + your Charisma modifier, but only to heal animals, plants, and vermin. You may reduce the number of dice healed to cure ability damage (your choice) to all affected creatures, curing 1 point of ability damage for each d6 that the channel energy is reduced. You can take other feats to add to this ability, such as Extra Channel, but not feats that alter this ability, such as Elemental Channel and Alignment Channel.</p>",
    },
    {
      name: "Reed Hunter",
      abilityType: "ex",
      level: 6,
      description:
        "<p>At 6th level, you gain blindsense 30 feet with respect to concealment and cover from fog, vegetation, or water. At 12th level, this improves to blindsight 30 feet with respect to these conditions.</p>",
    },
  ],
  "The Uskbond": [
    {
      name: "Absorb Pain",
      abilityType: "su",
      level: 1,
      description:
        "<p>Whenever you take lethal damage, you can choose as an immediate action to convert a number of points of this damage equal to 1d6 + your Wisdom modifier into nonlethal damage. When you use this ability, you gain a +4 profane bonus on all saving throws versus pain effects during the following round. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Gruesome Display",
      abilityType: "ex",
      level: 8,
      description:
        "<p>At 8th level, as a standard action you can alter your appearance in such intense, horrific ways that onlookers become nauseated. One creature you select within 30 feet who can see you must succeed at a Will save (DC = 10 + 1/2 your druid level + your Wisdom modifier) or be nauseated for a number of rounds equal to 1/2 your druid level. Every 2 levels beyond 8th, you can affect one additional creature, to a maximum of seven targets within 30 feet at 20th level. Each time you activate your gruesome display, you must affect at least one target, but you can choose to affect fewer targets than your maximum. Once you’ve targeted the maximum number of creatures granted by level (regardless of whether they successfully save to resist the effect or not), you cannot use gruesome display again for the remainder of the day. This is a mind-affecting fear effect.</p>",
    },
  ],
  Vermin: [
    {
      name: "Vermin Whisperer",
      abilityType: "su",
      level: 1,
      description:
        "<p>You can use your wild empathy ability on vermin. When you do so, you impart a modicum of implanted intelligence on the vermin, allowing you to interact with vermin as if they were animals. Vermin whisperer functions only on vermin that are mindless or have an Intelligence score of 2 or lower.</p>",
    },
    {
      name: "Sudden Sting",
      abilityType: "su",
      level: 8,
      description:
        "<p>At 8th level, you can inflict a lingering, painful sting as a swift action that requires a successful melee touch attack. This sting deals 1d4 points of piercing damage plus 1 point for every 2 druid levels you have, and the target must succeed at a Fortitude save (DC = 10 + half your druid level + your Constitution modifier) or become staggered for 1 round. This is a pain effect. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
  ],
  Vulture: [
    {
      name: "Death's Companion",
      abilityType: "ex",
      level: 1,
      description:
        "<p>Your totem grants you protection from the harbingers of death. As an immediate action, you gain a +2 bonus on saving throws against disease, death spells, and death effects that lasts a number of rounds equal to your druid level. This bonus increases by 2 at 6th level and every 5 levels thereafter, to a maximum of +8 at 16th level. You may use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
    {
      name: "Agent of Rebirth",
      abilityType: "sp",
      level: 8,
      description:
        "<p>At 8th level, you may expend a quantity of special oils worth 1,000 gp to cast reincarnate as a spell-like ability usable once per day. Additionally, when using this ability or casting reincarnate as a prepared spell, you have some influence over the physical form that the reincarnated spirit will take. When rolling against the spell’s incarnation table, you may roll twice and choose between the two results.</p>",
    },
  ],
  Wolf: [
    {
      name: "Pack Tactics",
      abilityType: "ex",
      level: 8,
      description:
        "<p>At 8th level, as a free action on your turn, you can designate an adjacent square; your attacks are treated as coming from that square for the purposes of determining whether or not you are flanking (this applies even if that square is occupied by an object or creature). This ends at the start of your next turn or if you move. If you are flanking a creature without using this ability, you may add your Wisdom bonus to your attack roll rather than the normal +2 flanking bonus. You can use this ability a number of times per day equal to 3 + your Wisdom modifier.</p>",
    },
  ],
};

/**
 * Hand-authored fixed bonus-feat grants for druid nature-bond domains, same
 * shape as `Domain.changes`' `bonusFeats` entries (Darkness/Rune) — Wolf is
 * the only domain whose 1st-level granted power names a specific feat
 * ("Improved Trip: You gain Improved Trip as a bonus feat") rather than
 * describing a power in prose. Applied directly to `DruidDomain.changes`;
 * the actual feat grant is resolved by name in the web layer, see
 * `DRUID_DOMAIN_GRANTED_FEATS` in `apps/web/src/model/feats.ts`.
 */
export const DRUID_DOMAIN_BONUS_FEAT_CHANGES: Record<string, Change[]> = {
  Wolf: [{ formula: "1", target: "bonusFeats", type: "untyped" }],
};

/**
 * Apply `SUPPLEMENTAL_DRUID_DOMAIN_FEATURES`/`DRUID_DOMAIN_BONUS_FEAT_CHANGES`
 * in place: pushes one `ClassFeature` per listed power and appends a resolved
 * `ClassFeatureGrant` for it to the matching druid domain's `features`
 * (sorted by level), and sets `changes` for any domain with a fixed bonus
 * feat. Throws on an unknown domain tag or an id collision — the same
 * drift/collision guards every other supplement in this module uses.
 */
export function applyDruidDomainFeatureSupplements(
  druidDomains: DruidDomain[],
  classFeatures: ClassFeature[],
): void {
  const byTag = new Map(druidDomains.map((d) => [d.tag, d]));
  const featureIds = new Set(classFeatures.map((f) => f.id));
  for (const [tag, powers] of Object.entries(SUPPLEMENTAL_DRUID_DOMAIN_FEATURES)) {
    const domain = byTag.get(tag);
    if (domain === undefined) {
      throw new Error(`[supplements] druid domain "${tag}" not found in vendored druid domains`);
    }
    for (const power of powers) {
      const powerSlug = slug(power.name);
      const id = `druid-domain:${slug(tag)}:${powerSlug}`;
      if (featureIds.has(id)) {
        throw new Error(`[supplements] duplicate druid domain power feature id: ${id}`);
      }
      featureIds.add(id);
      const uuid = `druid-domain-feature:${slug(tag)}:${powerSlug}`;
      classFeatures.push({
        id,
        name: power.name,
        uuid,
        description: power.description,
        ...(power.abilityType ? { abilityType: power.abilityType } : {}),
        sources: domain.sources,
        subType: "classFeat",
        changes: [],
        grantsBuffs: [],
      });
      domain.features = [
        ...domain.features,
        { level: power.level, uuid, featureId: id, name: power.name, resolved: true },
      ].sort((a, b) => a.level - b.level);
    }
  }
  for (const [tag, changes] of Object.entries(DRUID_DOMAIN_BONUS_FEAT_CHANGES)) {
    const domain = byTag.get(tag);
    if (domain === undefined) {
      throw new Error(`[supplements] druid domain "${tag}" not found in vendored druid domains`);
    }
    domain.changes = [...domain.changes, ...changes];
  }
}

/**
 * Hand-authored corrections for vendored `ArchetypeFeature.level` values that
 * contradict the feature's own description prose — issue #47 (consolidated
 * #45-wave archetype-extraction bug list). The third-party archetype CSV
 * dataset (`config.ts`'s `CLASS_ARCHETYPE_FILES`, read by
 * `transform/archetypes.ts`) occasionally tags a row's level column with a
 * value its own prose disagrees with, which shifts WHEN the (here, always
 * non-numeric/subsystem) ability starts showing as granted in
 * `resolveClassFeatures`'s `f.level <= <class level>` gate — sometimes by
 * several levels.
 *
 * Keyed by the feature's **id** (NOT its level-suffixed form re-derived from
 * the corrected level) — every consumer across `packages/engine/src/
 * archetype-extracted/` and `archetypes.ts` keys off the original id string
 * verbatim (e.g. `MISPAIRED_TARGET_REMAP`, the classification tables), so
 * only the numeric `level` field actually used for gating is corrected here;
 * the id/uuid intentionally keep their original (now level-mismatched)
 * suffix, same posture as `barbarian:jungle-rager:damage-reduction:8` (left
 * unfixed, per its own classification note) already tolerates.
 *
 * A mismatch that's numerically inert regardless (e.g.
 * `druid:ancient-guardian:patience-of-nature:1`, whose extracted formula
 * gates on `@class.unlevel` directly rather than this level field — see that
 * entry's note in `archetype-extracted/druid.ts`) is deliberately left out.
 */
export const SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL: Record<string, number> = {
  // Prose: "At 3rd level, a seeker of the lost gains a +1 competence bonus
  // on Perception checks to notice magical traps..." — vendored level column
  // reads 2.
  "rogue:seeker-of-the-lost:arcana-breaker:2": 3,
  // Prose: "At 13th level, a druid gains the ability to change her
  // appearance at will, as if using the alter self spell..." — vendored
  // level column reads 6.
  "druid:urban-druid:a-thousand-faces:6": 13,
  // Prose: "At 4th level, a realm wanderer must choose an animal companion
  // for his hunter's bond..." — vendored level column reads 0, which (unlike
  // a too-early level) shows the whole ability as granted from 1st level on.
  "ranger:realm-wanderer:queen-s-bond:0": 4,
};

/**
 * Hand-authored spell resistance for races whose signature SR is prose-only
 * upstream (races.json carries no `spellResist` change for these). Values per
 * the published Advanced Race Guide entries: Svirfneblin SR 11 + class
 * levels, a standard (not alternate) racial trait — same non-suppressing
 * posture as every other vendored alternate trait (`collect.ts`'s doc
 * comment) applies here too, so this is not wired to any trait swap.
 */
export const SUPPLEMENTAL_RACE_SPELL_RESISTANCE: Record<string, string> = {
  Svirfneblin: "11 + @attributes.hd.total",
};

/**
 * Apply `SUPPLEMENTAL_RACE_SPELL_RESISTANCE` in place, appending a
 * `spellResist` change to the matching race's `changes`. Throws if a named
 * race is absent from the vendored slice — a data-drift guard, mirroring
 * `resolveBloodlineSupplements`.
 */
export function applyRaceSpellResistanceSupplements(races: Race[]): void {
  const byName = new Map(races.map((r) => [r.name, r]));
  for (const [name, formula] of Object.entries(SUPPLEMENTAL_RACE_SPELL_RESISTANCE)) {
    const race = byName.get(name);
    if (race === undefined) {
      throw new Error(`[supplements] race "${name}" not found in vendored races`);
    }
    race.changes = [...race.changes, { formula, target: "spellResist", type: "racial" }];
  }
}

/**
 * Hand-authored special senses for every vendored race, mechanizing what each
 * race's own description prose already says. No race in the pinned pack
 * carries a `sense*` change (senses live in the "Senses Racial Traits"
 * section of `description` as text), while 20 of the pack's ALTERNATE racial
 * traits DO carry `sensedv`/`sensesc`/`sensets` changes — so before this
 * table a half-orc who took Acute Darkvision showed a 90-ft. darkvision line
 * and a stock half-orc showed none at all.
 *
 * Every entry is transcribed from the sentence in that race's own vendored
 * description (`applyRaceSenseSupplements` re-checks each one against the
 * description text at build time and throws on a mismatch), so this table
 * carries no independent numbers — it only makes the prose machine-readable.
 * The ten races with no entry (Ghoran, Gillman, Green Martian, Halfling,
 * Human, Kasatha, both Lashunta, Lizardfolk, Primitive Human) have no Senses
 * racial trait in their write-up; that absence is asserted by
 * `races.senses.test.ts` rather than assumed.
 *
 * Targets: Foundry's `sensedv`/`sensesc`/`sensebse`, plus this engine's own
 * `sensell` (low-light vision) and `sensesid` (see in darkness) for the two
 * senses Foundry models as actor booleans with no change target — see the
 * engine's `senses.ts`. Values are flat numbers with `operator: "set"`,
 * matching the vendored alternate traits; `1` is the on-value for the two
 * flags.
 *
 * Deliberately excluded — senses a race only has SITUATIONALLY, which would
 * be a lie as an unconditional sheet line (the prose stays visible in the
 * builder's race description):
 *
 *   - Adaro "Keen Scent": scent only underwater, at 180 ft.
 *   - Cecaelia "Tentacle Sense": blindsight 10 ft., a swift action that lasts
 *     only while concentrating.
 *   - Skinwalker's darkvision 60 ft.: bestial (change shape) form only.
 *
 * Astomoi are the one race whose entry needs reading alongside the prose:
 * their darkvision 60 IS unconditional, but it is a sightless telepathic
 * sense ("can't speak or see, but can mentally sense the area within 60 feet,
 * as per darkvision") and also caps their vision at 60 ft. — the cap is not
 * modeled.
 */
export const SUPPLEMENTAL_RACE_SENSES: Record<string, Readonly<Record<string, number>>> = {
  Aasimar: { sensedv: 60 },
  Adaro: { sensedv: 60, sensell: 1, sensebse: 30 },
  Android: { sensedv: 60, sensell: 1 },
  Aphorite: { sensedv: 60 },
  "Aquatic Elf": { sensell: 1 },
  Astomoi: { sensedv: 60, sensesc: 30 },
  "Being of Ib": { sensedv: 60, sensell: 1 },
  Caligni: { sensesid: 1 },
  Catfolk: { sensell: 1 },
  Cecaelia: { sensedv: 60 },
  Changeling: { sensedv: 60 },
  "Deep One Hybrid": { sensell: 1 },
  Dhampir: { sensedv: 60, sensell: 1 },
  Drow: { sensedv: 120 },
  "Drow Noble": { sensedv: 120 },
  Duergar: { sensedv: 120 },
  Duskwalker: { sensedv: 60 },
  Dwarf: { sensedv: 60 },
  Elf: { sensell: 1 },
  Fetchling: { sensedv: 60, sensell: 1 },
  Ganzi: { sensedv: 60 },
  Gathlain: { sensell: 1 },
  Gnoll: { sensedv: 60 },
  Gnome: { sensell: 1 },
  Goblin: { sensedv: 60 },
  Grindylow: { sensedv: 60 },
  Grippli: { sensedv: 60 },
  "Half-Elf": { sensell: 1 },
  "Half-Orc": { sensedv: 60 },
  Hobgoblin: { sensedv: 60 },
  Ifrit: { sensedv: 60 },
  Kitsune: { sensell: 1 },
  Kobold: { sensedv: 60 },
  Kuru: { sensell: 1 },
  Locathah: { sensell: 1 },
  Merfolk: { sensell: 1 },
  "Monkey Goblin": { sensell: 1 },
  Munavri: { sensedv: 120 },
  Nagaji: { sensell: 1 },
  Naiad: { sensell: 1 },
  Ogre: { sensedv: 60, sensell: 1 },
  "Orang-Pendak": { sensell: 1 },
  Orc: { sensedv: 60 },
  Oread: { sensedv: 60 },
  Ratfolk: { sensedv: 60 },
  "Reborn Samsaran": { sensell: 1 },
  Reptoid: { sensell: 1 },
  Rougarou: { sensell: 1, sensesc: 30 },
  Sahuagin: { sensedv: 60, sensebse: 30 },
  Samsaran: { sensell: 1 },
  Shabti: { sensedv: 60 },
  Skinwalker: { sensell: 1 },
  Strix: { sensedv: 60, sensell: 1 },
  Suli: { sensell: 1 },
  Svirfneblin: { sensedv: 120, sensell: 1 },
  Sylph: { sensedv: 60 },
  Syrinx: { sensedv: 60, sensell: 1 },
  Tengu: { sensell: 1 },
  Tiefling: { sensedv: 60 },
  Triaxian: { sensell: 1 },
  Triton: { sensedv: 60, sensell: 1 },
  Trox: { sensedv: 60 },
  Undine: { sensedv: 60 },
  Vanara: { sensell: 1 },
  "Vine Leshy": { sensedv: 60, sensell: 1 },
  Vishkanya: { sensell: 1 },
  Wayang: { sensedv: 60 },
  Wyrwood: { sensedv: 60, sensell: 1 },
  Wyvaran: { sensedv: 60, sensell: 1 },
  Yaddithian: { sensedv: 60 },
};

/**
 * Words that must appear in a race's description for each supplemented sense
 * target — the drift guard behind `SUPPLEMENTAL_RACE_SENSES`'s claim that
 * every entry only restates the race's own prose. Matched case-insensitively
 * against the description with HTML tags stripped.
 */
const SENSE_DESCRIPTION_KEYWORDS: Record<string, readonly string[]> = {
  sensedv: ["darkvision"],
  sensell: ["low-light", "lowlight", "low light"],
  sensesid: ["see in darkness"],
  sensesc: ["scent"],
  sensebse: ["blindsense"],
};

/**
 * Apply `SUPPLEMENTAL_RACE_SENSES` in place, appending one `set` change per
 * sense to the matching race's `changes`. Throws if a named race is absent
 * from the vendored slice (a data-drift guard, mirroring
 * `resolveBloodlineSupplements`) or if a supplemented sense isn't mentioned
 * anywhere in that race's own description — the latter catches both a typo
 * here and an upstream rewrite that changes what a race can actually see.
 *
 * The darkvision RANGE is not cross-checked: several descriptions state it
 * only in the "Senses Racial Traits" heading ("Darkvision: 60 ft") or spell
 * it out in words ("see perfectly in the dark up to 120 feet"), so a numeric
 * check would be a prose-parsing exercise with false failures. Ranges are
 * covered by the fixture assertions in `races.senses.test.ts` instead.
 */
export function applyRaceSenseSupplements(races: Race[]): void {
  const byName = new Map(races.map((r) => [r.name, r]));
  for (const [name, senses] of Object.entries(SUPPLEMENTAL_RACE_SENSES)) {
    const race = byName.get(name);
    if (race === undefined) {
      throw new Error(`[supplements] race "${name}" not found in vendored races`);
    }
    const description = (race.description ?? "").replace(/<[^>]*>/g, " ").toLowerCase();
    for (const [target, value] of Object.entries(senses)) {
      const keywords = SENSE_DESCRIPTION_KEYWORDS[target];
      if (keywords && !keywords.some((k) => description.includes(k))) {
        throw new Error(
          `[supplements] race "${name}" has a supplemented ${target} sense, but its description never mentions ${keywords[0]}`,
        );
      }
      race.changes = [
        ...race.changes,
        { formula: String(value), operator: "set", target, type: "racial" },
      ];
    }
  }
}

/**
 * Apply `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL` in place to a list of
 * normalized archetype features (mutates `.level` only; `id`/`uuid` are left
 * untouched — see that map's doc comment for why).
 */
export function applyArchetypeFeatureLevelSupplements(features: ArchetypeFeature[]): void {
  for (const feature of features) {
    const level = SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL[feature.id];
    if (level !== undefined) feature.level = level;
  }
}

/**
 * `@cl`-keyed projectile-count formulas for the handful of spells whose EFFECT
 * COUNT scales with caster level (rather than their `damage.parts[].formula`).
 * The vendored `damage.parts` carries only the flat per-hit damage — Magic
 * Missile's `1d4+1`, Scorching Ray's `4d6` — because the "N per M levels" rule
 * lives in the spell's prose, so `Spell.projectileCount` can't be derived and
 * is hand-authored here from the published CRB, keyed by spell **name** and
 * applied in `normalize.ts`. The tracker's spell strip renders it as
 * `<per-hit dice> ×N` (see `spellDamageParts`), keeping each ray/missile an
 * honest separate roll rather than folding the count into one dice total.
 *
 * Formulas floor RAW's "one, plus one per M levels beyond L, max K":
 *   - Magic Missile   — 1 + 1/2 levels beyond 1st, max 5 (5 at CL 9).
 *   - Scorching Ray   — 1 + 1/4 levels beyond 3rd, max 3 (3 at CL 11).
 * The `max(1, …)` floor guards a below-minimum caster level from yielding 0.
 */
export const SPELL_PROJECTILE_COUNTS: Record<string, string> = {
  "Magic Missile": "min(5, max(1, 1 + floor((@cl - 1) / 2)))",
  "Scorching Ray": "min(3, max(1, 1 + floor((@cl - 3) / 4)))",
};

/**
 * Apply `SPELL_PROJECTILE_COUNTS` in place, setting `projectileCount` on each
 * named spell. Throws if a named spell is absent from the vendored set — a
 * data-version drift guard, mirroring `resolveBloodlineSupplements`: a bump
 * that renames or drops one of these fails the build loudly rather than
 * silently dropping the ×N count.
 */
export function applySpellProjectileSupplements(spells: Spell[]): void {
  const byName = new Map(spells.map((s) => [s.name, s]));
  for (const [name, formula] of Object.entries(SPELL_PROJECTILE_COUNTS)) {
    const spell = byName.get(name);
    if (spell === undefined) {
      throw new Error(
        `[supplements] projectile-count spell "${name}" not found in vendored spells`,
      );
    }
    spell.projectileCount = formula;
  }
}

/* ---------------------------------------------------------- prestige classes -- */

/**
 * Hand-authored prestige-class chassis (issue #66 chunk 1) — the pinned
 * Foundry pf1 pack ships NO prestige classes at all (confirmed: every doc
 * under `packs/classes` carries `system.subType: "base"`), so unlike every
 * other entity in this pipeline there is no upstream doc to transform. These
 * two entries are authored clean-room from the published Core Rulebook class
 * tables (PZO1110), fetched and verified directly against raw HTML from
 * legacy.aonprd.com (not summarized) — cross-checked line-by-line against
 * d20pfsrd.com and the live aonprd.com class pages, all three agreeing.
 *
 * A save-table surprise worth flagging: naive expectation was "good saves use
 * the new `highPrestige` tier, poor saves reuse the existing `low` tier" —
 * but the fetched tables show BOTH classes' poor-save columns following
 * 0,1,1,1,2,2,2,3,3,3 (levels 1-10), which is NOT `low`'s `floor(level/3)`
 * (0,0,1,1,1,2,2,2,3,3). Cross-checked against a third CRB prestige class
 * (Assassin) to rule out a one-off transcription error — Assassin's poor
 * columns (Fort/Will) match the same 0,1,1,1,2,2,2,3,3,3 sequence, and its
 * good column (Ref) matches `highPrestige` exactly, while Wizard (a base
 * class) matches base `low` exactly. So PF1's 10-level prestige classes
 * genuinely use a DIFFERENT poor-save formula than 20-level base classes —
 * see the new `lowPrestige` `SaveTier` and its doc comment in `@pf1/schema`
 * `primitives.ts` for the formula. Both classes' good saves DO use the
 * expected `highPrestige` tier (verified: Fort for Eldritch Knight, Will for
 * Mystic Theurge, both 1,1,2,2,3,3,4,4,5,5).
 *
 * Synthetic ids follow the same non-Foundry-shaped posture as
 * `Archetype`/`ArchetypeFeature` (also hand/third-party-authored, not
 * Foundry docs): a `prestige:` id prefix and a distinct `prestige-class:` /
 * `prestige-feature:` uuid scheme that can never collide with a real
 * `Compendium.pf1.<pack>.Item.<foundryId>` uuid or a real class/feature's
 * 16-character alphanumeric Foundry id.
 *
 * `applyPrestigeClassSupplements` (below) throws loudly on any id/uuid/tag
 * collision against the already-normalized vendored classes/classFeatures,
 * the same "fail the build, don't silently overwrite" posture as
 * `resolveBloodlineSupplements`.
 */
function prestigeFeature(
  classSlug: string,
  slug: string,
  name: string,
  description: string,
  tag: string,
  /**
   * Trivially-correct mechanical effect, e.g. Dragon Disciple's flat ability-
   * score increases (issue #66 chunk 4). Empty for the overwhelming majority
   * of hand-authored prestige features, which stay prose-only per the same
   * honesty bar as chunk 1 — see the chunk-4 module doc comment above.
   */
  changes: Change[] = [],
  /**
   * Publication the feature comes from. Defaults to the CRB because every
   * prestige class authored here until Student of War was one of the CRB ten.
   */
  sources: SourceRef[] = [{ id: "PZO1110" }],
): ClassFeature {
  const id = `prestige:${classSlug}:${slug}`;
  return {
    id,
    name,
    uuid: `prestige-feature:${classSlug}:${slug}`,
    description,
    sources,
    tag,
    subType: "classFeat",
    changes,
    grantsBuffs: [],
  };
}

function prestigeGrant(
  level: number,
  classSlug: string,
  slug: string,
  name: string,
): ClassFeatureGrant {
  return {
    level,
    uuid: `prestige-feature:${classSlug}:${slug}`,
    featureId: `prestige:${classSlug}:${slug}`,
    name,
    resolved: true,
  };
}

const ELDRITCH_KNIGHT_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "eldritch-knight",
    "diverse-training",
    "Diverse Training",
    "<p>For the purpose of qualifying for feats, an eldritch knight treats her eldritch knight levels as fighter levels (adding them to any fighter levels she already has, or treating them as fighter levels outright if she has none), and separately treats her eldritch knight levels as levels of whatever arcane spellcasting class she used to qualify for the prestige class.</p>",
    "diverseTraining",
  ),
  prestigeFeature(
    "eldritch-knight",
    "bonus-combat-feat",
    "Bonus Combat Feat",
    "<p>At 1st level, and again at 5th and 9th level, an eldritch knight gains a bonus feat drawn from the list of combat feats available to a fighter, in addition to the feats she gains from advancing in level as normal. She must meet a chosen feat's prerequisites as usual.</p>",
    "bonusCombatFeatEk",
  ),
  prestigeFeature(
    "eldritch-knight",
    "spell-critical",
    "Spell Critical",
    "<p>Starting at 10th level, whenever an eldritch knight confirms a critical hit with a weapon attack, she can cast a spell as a swift action. The spell must target the struck creature or include it within its area of effect.</p>",
    "spellCritical",
  ),
];

const MYSTIC_THEURGE_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "mystic-theurge",
    "combined-spells",
    "Combined Spells",
    "<p>Starting at 1st level, a mystic theurge can prepare a spell from one of her two spellcasting classes into a spell slot one level higher belonging to her other spellcasting class. At 1st level, the highest-level spell she can prepare this way is a 1st-level spell; the maximum increases by one every two levels thereafter (2nd at 3rd level, 3rd at 5th level, 4th at 7th level, 5th at 9th level).</p>",
    "combinedSpells",
  ),
  prestigeFeature(
    "mystic-theurge",
    "spell-synthesis",
    "Spell Synthesis",
    "<p>Once per day at 10th level, a mystic theurge can spend a single action to cast two spells at once, one drawn from each of her spellcasting classes. A target struck by both spells takes a &minus;2 penalty on saving throws made against them, and the mystic theurge gains a +2 bonus on caster level checks made to overcome that target's spell resistance.</p>",
    "spellSynthesis",
  ),
];

/**
 * Issue #66 chunk 4 — the remaining eight CRB (PZO1110) prestige classes.
 * Same clean-room posture and verification method as chunk 1 above: fetched
 * and cross-checked raw HTML from BOTH legacy.aonprd.com AND the current
 * aonprd.com (two independently-rendered sources per class, agreeing
 * line-for-line on every table cell quoted here).
 *
 * The CRB actually has TEN prestige classes, not the nine chunk 1's doc
 * comment might suggest by omission — chunk 1 covered Eldritch Knight and
 * Mystic Theurge; **Arcane Archer** is the CRB's tenth and was not part of
 * either chunk's original enumeration until now (confirmed against
 * `legacy.aonprd.com/corerulebook/prestigeClasses.html`'s own table of
 * contents: Arcane Archer, Arcane Trickster, Assassin, Dragon Disciple,
 * Duelist, Eldritch Knight, Loremaster, Mystic Theurge, Pathfinder
 * Chronicler, Shadowdancer).
 *
 * Save/BAB tiers all verified against the `highPrestige`/`lowPrestige`/
 * `high`/`med`/`low` formulas in `@pf1/schema` `primitives.ts`. A genuine
 * surprise turned up repeatedly: several of these classes have TWO good
 * saves rather than the usual one-good/two-poor split (they're built to
 * splice two source classes' strengths together) — Arcane Archer (Fort+Ref),
 * Arcane Trickster (Ref+Will), Dragon Disciple (Fort+Will), Pathfinder
 * Chronicler (Ref+Will). Nothing here violates the tier formulas themselves;
 * it's just an unusual (but doubly-source-confirmed) choice of which two
 * tiers a class uses.
 *
 * Ability-score-increase features (Dragon Disciple's Str/Con/Int bumps) use
 * `changes` with `type: "untyped"` (always sums, per `stacking.ts`) rather
 * than `"racial"` or similar typed category — typed bonuses of the same type
 * do NOT stack (highest wins), which would silently cap Dragon Disciple's
 * two separate +2 Str increases (2nd and 4th level) at +2 total instead of
 * the correct +4. Where the same flat bonus needs to apply at two DIFFERENT
 * levels, this reuses ONE `ClassFeature` (one `changes` array) referenced by
 * TWO separate `ClassFeatureGrant` entries at the two levels — `collect.ts`'s
 * per-class feature loop applies a grant's changes once per grant whose level
 * has been reached, so two grants of the same feature correctly double the
 * effect once both levels are reached, without inventing two differently-
 * named features for what the CRB table treats as the same repeating line.
 * All other numeric-flavored abilities (natural armor increases, dragon
 * bite, breath weapon, etc.) stay prose-only per the same honesty bar as
 * chunk 1 (no `changes`/`uses` wiring beyond what's trivially correct).
 *
 * A handful of feature NAMES collide with already-vendored (real, Foundry-
 * sourced) `ClassFeature` names — e.g. Assassin's own "Sneak Attack" vs.
 * Rogue's, or Shadowdancer's "Hide in Plain Sight" vs. Assassin's own (both
 * hand-authored in this same file) — since `applyPrestigeClassSupplements`
 * throws loudly on any name collision (against vendored features AND against
 * earlier entries in this same supplemental list, since it mutates in place
 * as it pushes). Colliding names are disambiguated with a parenthetical
 * class suffix (e.g. "Sneak Attack (Assassin)"); everything else keeps its
 * plain published name, matching chunk 1's economy.
 */
const KNOWLEDGE_ALL = ["kar", "kdu", "ken", "kge", "khi", "klo", "kna", "kno", "kpl", "kre"];

const ARCANE_ARCHER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "arcane-archer",
    "enhance-arrows",
    "Enhance Arrows",
    "<p>Every nonmagical arrow an arcane archer nocks and looses becomes magical for that shot, gaining a +1 enhancement bonus; she need not pay any gp cost to do this, and the arrows only function as magical for her. At 3rd level she can add flaming, frost, or shock; at 5th level, distance; at 7th level, flaming burst, icy burst, or shocking burst; and at 9th level, anarchic, axiomatic, holy, or unholy (matching her own alignment).</p>",
    "enhanceArrows",
  ),
  prestigeFeature(
    "arcane-archer",
    "imbue-arrow",
    "Imbue Arrow",
    "<p>At 2nd level, an arcane archer can cast an area-effect spell and center it where an arrow she fires lands, using the bow's range instead of the spell's own range.</p>",
    "imbueArrow",
  ),
  prestigeFeature(
    "arcane-archer",
    "seeker-arrow",
    "Seeker Arrow",
    "<p>At 4th level, once per day (and one additional time per day for every two levels beyond 4th, to a maximum of four times per day at 10th level), an arcane archer can fire an arrow at a known target within range that travels to strike it, even around corners or behind cover.</p>",
    "seekerArrow",
  ),
  prestigeFeature(
    "arcane-archer",
    "phase-arrow",
    "Phase Arrow",
    "<p>At 6th level, once per day (and one additional time per day for every two levels beyond 6th, to a maximum of three times per day at 10th level), an arcane archer can fire an arrow that passes through any nonmagical barrier or wall on its way to the target.</p>",
    "phaseArrow",
  ),
  prestigeFeature(
    "arcane-archer",
    "hail-of-arrows",
    "Hail of Arrows",
    "<p>Once per day at 8th level, an arcane archer can fire a single arrow at each and every target within range, up to a maximum number of targets equal to her arcane archer level.</p>",
    "hailOfArrows",
  ),
  prestigeFeature(
    "arcane-archer",
    "arrow-of-death",
    "Arrow of Death",
    "<p>At 10th level, an arcane archer can spend a day crafting a single slaying arrow. A target struck by it must succeed at a Fortitude save (DC 20 + the arcane archer's Charisma modifier) or die instantly.</p>",
    "arrowOfDeath",
  ),
];

const ARCANE_TRICKSTER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "arcane-trickster",
    "ranged-legerdemain",
    "Ranged Legerdemain",
    "<p>An arcane trickster can use Disable Device and Sleight of Hand at a range of 30 feet. Working at a distance increases the check's DC by 5, and she cannot take 10 on the check; the targeted object must weigh 5 pounds or less.</p>",
    "rangedLegerdemain",
  ),
  prestigeFeature(
    "arcane-trickster",
    "sneak-attack",
    "Sneak Attack (Arcane Trickster)",
    "<p>Functions as the rogue ability of the same name, and stacks with sneak attack granted by another class. The extra damage is +1d6 at 2nd level, increasing by +1d6 every other level thereafter (4th, 6th, 8th, 10th) to a maximum of +5d6 at 10th level.</p>",
    "sneakAttackArcaneTrickster",
  ),
  prestigeFeature(
    "arcane-trickster",
    "impromptu-sneak-attack",
    "Impromptu Sneak Attack",
    "<p>Starting at 3rd level, once per day an arcane trickster can declare one melee or ranged attack (target no more than 30 feet away, if ranged) to be a sneak attack — the target loses its Dexterity bonus to AC against that attack only. At 7th level she can do this twice per day.</p>",
    "impromptuSneakAttack",
  ),
  prestigeFeature(
    "arcane-trickster",
    "tricky-spells",
    "Tricky Spells",
    "<p>Starting at 5th level, an arcane trickster can cast her spells without verbal or somatic components, as though under the effect of both Still Spell and Silent Spell, without a level or casting-time increase. Usable 3 times per day at 5th level, 4 times per day at 7th, and 5 times per day at 9th.</p>",
    "trickySpells",
  ),
  prestigeFeature(
    "arcane-trickster",
    "invisible-thief",
    "Invisible Thief",
    "<p>At 9th level, an arcane trickster can become invisible as a free action, as though under the effect of greater invisibility, for a number of rounds per day equal to her arcane trickster level.</p>",
    "invisibleThief",
  ),
  prestigeFeature(
    "arcane-trickster",
    "surprise-spells",
    "Surprise Spells",
    "<p>At 10th level, an arcane trickster can add her sneak attack damage to any damaging spell against a flat-footed target; the additional damage applies only to hit-point damage and is of the same type as the spell.</p>",
    "surpriseSpells",
  ),
];

const ASSASSIN_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "assassin",
    "sneak-attack",
    "Sneak Attack (Assassin)",
    "<p>Functions as the rogue ability of the same name, and stacks with sneak attack granted by another class. The extra damage is +1d6 at 1st level, increasing by +1d6 at 3rd, 5th, 7th, and 9th level, to a maximum of +5d6 at 9th level.</p>",
    "sneakAttackAssassin",
  ),
  prestigeFeature(
    "assassin",
    "death-attack",
    "Death Attack",
    "<p>If an assassin studies her victim for 3 consecutive rounds (a standard action each round) and then makes a sneak attack with a melee weapon that deals damage, the target must succeed at a Fortitude save (DC 10 + the assassin's class level + her Intelligence modifier) or die; on a failed save against a chosen paralysis effect instead, the target is helpless for 1d6 rounds plus 1 round per assassin level. The death attack fails if the target notices the assassin or recognizes her as an enemy first, and if not used within 3 rounds of completing the study, or if it fails, a fresh 3 rounds of study is required.</p>",
    "deathAttack",
  ),
  prestigeFeature(
    "assassin",
    "poison-use",
    "Poison Use (Assassin)",
    "<p>An assassin is trained in the use of poison and never risks accidentally poisoning herself when applying poison to a blade.</p>",
    "poisonUseAssassin",
  ),
  prestigeFeature(
    "assassin",
    "save-bonus-against-poison",
    "Save Bonus Against Poison",
    "<p>Starting at 2nd level, an assassin gains a +1 bonus on saving throws against poison; this bonus increases by +1 every two levels thereafter (4th, 6th, 8th, 10th), to a maximum of +5 at 10th level.</p>",
    "saveBonusAgainstPoison",
  ),
  prestigeFeature(
    "assassin",
    "uncanny-dodge",
    "Uncanny Dodge (Assassin)",
    "<p>At 2nd level, an assassin can't be caught flat-footed, even by an invisible attacker (though she still loses her Dexterity bonus to AC if immobilized, or if successfully feinted). If she already has uncanny dodge from another class, she gains improved uncanny dodge instead.</p>",
    "uncannyDodgeAssassin",
  ),
  prestigeFeature(
    "assassin",
    "hidden-weapons",
    "Hidden Weapons",
    "<p>At 4th level, an assassin adds her assassin level as a bonus on Sleight of Hand checks made to conceal a weapon on her body.</p>",
    "hiddenWeapons",
  ),
  prestigeFeature(
    "assassin",
    "true-death",
    "True Death",
    "<p>Starting at 4th level, a creature slain by an assassin's death attack is harder to restore to life: any raise dead or similar spell requires a caster level check (DC 15 + the assassin's level) or the spell fails and its material component is wasted. Casting remove curse (DC 10 + the assassin's level) the round before negates this effect.</p>",
    "trueDeath",
  ),
  prestigeFeature(
    "assassin",
    "improved-uncanny-dodge",
    "Improved Uncanny Dodge (Assassin)",
    "<p>At 5th level, an assassin can no longer be flanked, unless the attacker has at least four more rogue levels than she has assassin levels (levels from other uncanny-dodge-granting classes stack for this purpose).</p>",
    "improvedUncannyDodgeAssassin",
  ),
  prestigeFeature(
    "assassin",
    "quiet-death",
    "Quiet Death",
    "<p>At 6th level, whenever an assassin kills with a death attack during a surprise round, she can attempt a Stealth check opposed by nearby creatures' Perception checks to keep them from identifying her as the killer, or even noticing the death, for a few moments.</p>",
    "quietDeath",
  ),
  prestigeFeature(
    "assassin",
    "hide-in-plain-sight",
    "Hide in Plain Sight (Assassin)",
    "<p>At 8th level, an assassin can use Stealth even while being observed, as long as she is within 10 feet of some sort of shadow (though not her own).</p>",
    "hideInPlainSightAssassin",
  ),
  prestigeFeature(
    "assassin",
    "swift-death",
    "Swift Death",
    "<p>Once per day at 9th level, an assassin can attempt a death attack with a melee weapon against a foe she has not studied beforehand.</p>",
    "swiftDeath",
  ),
  prestigeFeature(
    "assassin",
    "angel-of-death",
    "Angel of Death",
    "<p>At 10th level, once per day, an assassin can declare (before the attack roll) that a successful death attack crumbles the target's body to dust, preventing raise dead and resurrection (though not true resurrection). If the attack misses or the target saves, the ability is wasted.</p>",
    "angelOfDeath",
  ),
];

const DRAGON_DISCIPLE_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "dragon-disciple",
    "blood-of-dragons",
    "Blood of Dragons",
    "<p>A dragon disciple's levels in this class stack with any sorcerer levels she has for the purpose of determining the powers of a draconic bloodline (though not spells per day). A dragon disciple with no sorcerer levels instead gains draconic bloodline powers as if her dragon disciple level were her sorcerer level; if she has sorcerer levels, they must be (and any future sorcerer levels must also be) of the draconic bloodline, and she must choose the same dragon type as that bloodline (or choose one, if she has no sorcerer levels).</p>",
    "bloodOfDragons",
  ),
  prestigeFeature(
    "dragon-disciple",
    "natural-armor",
    "Natural Armor",
    "<p>A dragon disciple's hide gradually toughens as she takes on draconic traits, granting a cumulative +1 natural armor bonus to AC at 1st, 4th, and 7th level (+3 total by 7th level).</p>",
    "naturalArmor",
  ),
  prestigeFeature(
    "dragon-disciple",
    "strength-increase",
    "Strength Increase",
    "<p>A dragon disciple's Strength score permanently increases by 2 at 2nd level, and again at 4th level.</p>",
    "strengthIncrease",
    [{ formula: "2", target: "str", type: "untyped" }],
  ),
  prestigeFeature(
    "dragon-disciple",
    "bloodline-feat",
    "Draconic Bloodline Feat",
    "<p>At 2nd level, and again at 5th and 8th level, a dragon disciple gains a bonus feat drawn from her draconic sorcerer bloodline's bonus feat list, in addition to any feats gained from advancing in level as normal.</p>",
    "bloodlineFeat",
  ),
  prestigeFeature(
    "dragon-disciple",
    "dragon-bite",
    "Dragon Bite",
    "<p>At 2nd level, a dragon disciple gains a bite attack, usable as a primary natural attack, dealing 1d6 points of damage (1d4 if Small) plus 1-1/2 times her Strength modifier. At 6th level, the bite deals an additional 1d6 points of energy damage matching her draconic bloodline's associated energy type.</p>",
    "dragonBite",
  ),
  prestigeFeature(
    "dragon-disciple",
    "breath-weapon",
    "Breath Weapon",
    "<p>Starting at 3rd level, a dragon disciple gains a breath weapon usable once per day, matching her draconic bloodline's breath weapon in shape, damage type, and save; she gains an additional daily use whenever her draconic bloodline power would grant one.</p>",
    "breathWeapon",
  ),
  prestigeFeature(
    "dragon-disciple",
    "blindsense",
    "Blindsense",
    "<p>At 5th level, a dragon disciple gains blindsense out to 30 feet; this range increases to 60 feet at 10th level.</p>",
    "blindsense",
  ),
  prestigeFeature(
    "dragon-disciple",
    "constitution-increase",
    "Constitution Increase",
    "<p>A dragon disciple's Constitution score permanently increases by 2 at 6th level.</p>",
    "constitutionIncrease",
    [{ formula: "2", target: "con", type: "untyped" }],
  ),
  prestigeFeature(
    "dragon-disciple",
    "dragon-form",
    "Dragon Form",
    "<p>At 7th level, once per day, a dragon disciple can assume dragon form as though using form of the dragon I. At 10th level she can do so twice per day, and it functions as form of the dragon II; both must match her draconic bloodline's dragon type.</p>",
    "dragonForm",
  ),
  prestigeFeature(
    "dragon-disciple",
    "intelligence-increase",
    "Intelligence Increase",
    "<p>A dragon disciple's Intelligence score permanently increases by 2 at 8th level.</p>",
    "intelligenceIncrease",
    [{ formula: "2", target: "int", type: "untyped" }],
  ),
  prestigeFeature(
    "dragon-disciple",
    "wings",
    "Wings",
    "<p>At 9th level, a dragon disciple sprouts wings, granting a fly speed as her draconic bloodline's wings power (or the appropriate speed for her size if no sorcerer bloodline levels apply).</p>",
    "wings",
  ),
];

const DUELIST_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "duelist",
    "canny-defense",
    "Canny Defense",
    "<p>When wearing light or no armor and not using a shield, a duelist adds 1 point of Intelligence bonus (if any) per duelist level as a dodge bonus to AC while wielding a melee weapon; she loses this bonus whenever she loses her Dexterity bonus to AC.</p>",
    "cannyDefense",
  ),
  prestigeFeature(
    "duelist",
    "precise-strike",
    "Precise Strike",
    "<p>A duelist adds her duelist level to the damage roll when striking with a light or one-handed piercing weapon, provided she attacks with no weapon in her other hand and no shield; this only works against living creatures with discernible anatomy.</p>",
    "preciseStrike",
  ),
  prestigeFeature(
    "duelist",
    "improved-reaction",
    "Improved Reaction",
    "<p>At 2nd level, a duelist gains a +2 bonus on initiative checks, increasing to +4 at 8th level; this stacks with the Improved Initiative feat.</p>",
    "improvedReaction",
  ),
  prestigeFeature(
    "duelist",
    "parry",
    "Parry",
    "<p>At 2nd level, a duelist who takes a full attack action with a light or one-handed piercing weapon can forgo one attack to instead attempt, as an immediate action before her next turn, to parry an attack against her or an adjacent ally: she makes an attack roll with the same bonus as the forgone attack, and if it exceeds the attacker's roll, the attack automatically misses. She takes a &minus;4 penalty per size category the attacker is larger than her, and a further &minus;4 penalty when parrying on an ally's behalf.</p>",
    "parry",
  ),
  prestigeFeature(
    "duelist",
    "enhanced-mobility",
    "Enhanced Mobility",
    "<p>Starting at 3rd level, when wearing light or no armor and not using a shield, a duelist gains an additional +4 bonus to AC against attacks of opportunity provoked by moving out of a threatened square.</p>",
    "enhancedMobility",
  ),
  prestigeFeature(
    "duelist",
    "combat-reflexes",
    "Combat Reflexes (Duelist)",
    "<p>At 4th level, a duelist gains the benefit of the Combat Reflexes feat when wielding a light or one-handed piercing weapon.</p>",
    "combatReflexesDuelist",
  ),
  prestigeFeature(
    "duelist",
    "grace",
    "Grace",
    "<p>At 4th level, a duelist gains a +2 competence bonus on Reflex saves while wearing light or no armor and not using a shield.</p>",
    "grace",
  ),
  prestigeFeature(
    "duelist",
    "riposte",
    "Riposte",
    "<p>Starting at 5th level, a duelist who successfully parries an attack can make an attack of opportunity against the attacker, if it is within reach.</p>",
    "riposte",
  ),
  prestigeFeature(
    "duelist",
    "acrobatic-charge",
    "Acrobatic Charge",
    "<p>At 6th level, a duelist can charge through difficult terrain that would normally prevent a charge, though she may still need to make checks appropriate to the terrain.</p>",
    "acrobaticCharge",
  ),
  prestigeFeature(
    "duelist",
    "elaborate-defense",
    "Elaborate Defense",
    "<p>At 7th level, when fighting defensively or using total defense in melee, a duelist gains an additional +1 dodge bonus to AC for every 3 duelist levels she has.</p>",
    "elaborateDefense",
  ),
  prestigeFeature(
    "duelist",
    "deflect-arrows",
    "Deflect Arrows (Duelist)",
    "<p>At 9th level, a duelist gains the benefit of the Deflect Arrows feat while wielding a light or one-handed piercing weapon, without needing a free hand.</p>",
    "deflectArrowsDuelist",
  ),
  prestigeFeature(
    "duelist",
    "no-retreat",
    "No Retreat",
    "<p>At 9th level, an adjacent enemy that takes a withdraw action provokes an attack of opportunity from the duelist.</p>",
    "noRetreat",
  ),
  prestigeFeature(
    "duelist",
    "crippling-critical",
    "Crippling Critical",
    "<p>At 10th level, when a duelist confirms a critical hit with a light or one-handed piercing weapon, she can apply one additional effect on top of the damage dealt: reduce all the target's speeds by 10 feet (minimum 5 feet) for 1 minute, 1d4 points of Strength or Dexterity damage, a &minus;4 penalty on saves for 1 minute, a &minus;4 penalty to AC for 1 minute, or 2d6 points of bleed damage.</p>",
    "cripplingCritical",
  ),
];

const LOREMASTER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "loremaster",
    "secret",
    "Secret",
    "<p>At 1st level, and every two levels thereafter (3rd, 5th, 7th, 9th), a loremaster chooses one secret from the Loremaster Secrets list, gaining its benefit.</p>",
    "secret",
  ),
  prestigeFeature(
    "loremaster",
    "lore",
    "Lore",
    "<p>At 2nd level, a loremaster adds half her loremaster level to all Knowledge skill checks, and can make all Knowledge checks untrained.</p>",
    "lore",
  ),
  prestigeFeature(
    "loremaster",
    "bonus-languages",
    "Bonus Languages",
    "<p>At 4th level, and again at 8th level, a loremaster can learn any one new language.</p>",
    "bonusLanguages",
  ),
  prestigeFeature(
    "loremaster",
    "greater-lore",
    "Greater Lore",
    "<p>At 6th level, a loremaster gains a +10 circumstance bonus on Spellcraft checks made to identify the properties of a magic item she examines.</p>",
    "greaterLore",
  ),
  prestigeFeature(
    "loremaster",
    "true-lore",
    "True Lore",
    "<p>Once per day at 10th level, a loremaster can use her knowledge to duplicate the effect of legend lore or analyze dweomer.</p>",
    "trueLore",
  ),
];

const PATHFINDER_CHRONICLER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "pathfinder-chronicler",
    "bardic-knowledge",
    "Bardic Knowledge (Pathfinder Chronicler)",
    "<p>Identical to the bard class feature of the same name; levels in this class stack with levels in any other class that grants a similar ability.</p>",
    "bardicKnowledgePathfinderChronicler",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "deep-pockets",
    "Deep Pockets",
    "<p>A Pathfinder chronicler can carry a stock of unspecified minor equipment worth up to 100 gp per class level; as a full-round action she can retrieve any specific item weighing 10 pounds or less, deducting its value from the allocated total. Spending an hour and the necessary gold restores the stock to full. With an hour spent packing daily, she also gains a +4 bonus to effective Strength for determining her light load, and a +4 bonus on Sleight of Hand checks to conceal small objects.</p>",
    "deepPockets",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "master-scribe",
    "Master Scribe",
    "<p>A Pathfinder chronicler adds her class level as a bonus on Linguistics, Profession (scribe), and Use Magic Device checks involving scrolls or other written magic; she can decipher unfamiliar text as a full-round action, and can always take 10 on Linguistics and Profession (scribe) checks, even under duress.</p>",
    "masterScribe",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "live-to-tell-the-tale",
    "Live to Tell the Tale",
    "<p>Once per day per two class levels, a Pathfinder chronicler can attempt a new saving throw against any ongoing effect against which she failed a save in a previous round.</p>",
    "liveToTellTheTale",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "pathfinding",
    "Pathfinding",
    "<p>A Pathfinder chronicler gains a +5 bonus on Survival checks to avoid getting lost and on Intelligence checks to escape a maze spell, and always uses the road/trail overland movement rate even in trackless terrain. With a DC 15 Survival check, she can extend this benefit to one companion per class level.</p>",
    "pathfinding",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "bardic-performance",
    "Bardic Performance (Pathfinder Chronicler)",
    "<p>Functions as the bard class feature of the same name, except the Pathfinder chronicler's effective bard level for it is 2 lower than her class level.</p>",
    "bardicPerformancePathfinderChronicler",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "improved-aid",
    "Improved Aid",
    "<p>At 3rd level, a successful aid another action grants a +4 bonus rather than the normal +2.</p>",
    "improvedAid",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "epic-tales",
    "Epic Tales",
    "<p>At 4th level, a Pathfinder chronicler can spend 1 hour inscribing an epic tale that conveys the effects of her bardic performance through the written word, expending a number of rounds of bardic performance equal to twice the tale's duration (maximum 10 rounds). Activating it is a full-round action; it lasts 1 day per class level and grants its reader bardic-music-like benefits for half the rounds expended.</p>",
    "epicTales",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "whispering-campaign",
    "Whispering Campaign",
    "<p>At 5th level, a Pathfinder chronicler can spend a use of bardic performance to denounce a creature in person (as doom) or denounce it to others (as enthrall, shifting the listeners' attitude toward the target one step for 1 day per class level).</p>",
    "whisperingCampaign",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "inspire-action",
    "Inspire Action",
    "<p>At 6th level, a Pathfinder chronicler can exhort one ally within hearing to immediately take an extra move action; at 9th level she can instead grant an extra standard action.</p>",
    "inspireAction",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "call-down-the-legends",
    "Call Down the Legends",
    "<p>Once per week as a full-round action at 7th level, a Pathfinder chronicler can summon 2d4 4th-level human barbarians with standard starting equipment, as though using a bronze horn of Valhalla.</p>",
    "callDownTheLegends",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "greater-epic-tales",
    "Greater Epic Tales",
    "<p>At 8th level, an epic tale read aloud by someone else takes effect as though the Pathfinder chronicler herself had used the bardic performance, but targets and uses the reader's Charisma score.</p>",
    "greaterEpicTales",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "lay-of-the-exalted-dead",
    "Lay of the Exalted Dead",
    "<p>Once per week as a full-round action at 10th level, a Pathfinder chronicler can summon 1d4+1 5th-level incorporeal human barbarians equipped with +2 studded leather and +1 ghost touch greataxes, as though using an iron horn of Valhalla. Enemies who see them must succeed at a Will save (DC 15 + the chronicler's Charisma modifier) or be shaken for 1 round per summoned barbarian.</p>",
    "layOfTheExaltedDead",
  ),
];

const SHADOWDANCER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "shadowdancer",
    "hide-in-plain-sight",
    "Hide in Plain Sight (Shadowdancer)",
    "<p>A shadowdancer can use Stealth even while being observed, as long as she is within 10 feet of an area of dim light (though not her own shadow).</p>",
    "hideInPlainSightShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "evasion",
    "Evasion (Shadowdancer)",
    "<p>At 2nd level, a shadowdancer takes no damage on a successful Reflex save against an effect that normally deals half damage on a successful save, as long as she is wearing light or no armor. A helpless shadowdancer does not gain the benefit of evasion.</p>",
    "evasionShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "darkvision",
    "Darkvision",
    "<p>At 2nd level, a shadowdancer gains darkvision with a range of 60 feet, or increases her existing darkvision range by 30 feet.</p>",
    "darkvision",
  ),
  prestigeFeature(
    "shadowdancer",
    "uncanny-dodge",
    "Uncanny Dodge (Shadowdancer)",
    "<p>At 2nd level, a shadowdancer can't be caught flat-footed, even by an invisible attacker (though she still loses her Dexterity bonus to AC if immobilized, or if successfully feinted). If she already has uncanny dodge from another class, she gains improved uncanny dodge instead.</p>",
    "uncannyDodgeShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "rogue-talent",
    "Rogue Talent",
    "<p>At 3rd level, and every three levels thereafter (6th, 9th), a shadowdancer gains a rogue talent, functioning as the rogue class feature of the same name; she can't select the same talent twice.</p>",
    "rogueTalent",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-illusion",
    "Shadow Illusion",
    "<p>At 3rd level, a shadowdancer can create visual illusions as silent image, using her shadowdancer level as caster level, usable once per day for every two shadowdancer levels she has.</p>",
    "shadowIllusion",
  ),
  prestigeFeature(
    "shadowdancer",
    "summon-shadow",
    "Summon Shadow",
    "<p>At 3rd level, a shadowdancer gains the service of an undead shadow companion matching her alignment, with hit points equal to half her own total; dismissing it prematurely requires a DC 15 Fortitude save or she takes a permanent negative level.</p>",
    "summonShadow",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-call",
    "Shadow Call",
    "<p>At 4th level, a shadowdancer can create quasi-real illusions of objects and creatures as shadow conjuration, using her shadowdancer level as caster level; at 10th level this instead functions as greater shadow conjuration.</p>",
    "shadowCall",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-jump",
    "Shadow Jump",
    "<p>Starting at 4th level, a shadowdancer can travel between two shadows as though using dimension door, as long as both areas have at least dim light; the total distance she can travel this way per day is 40 feet at 4th level, 80 feet at 6th, 160 feet at 8th, and 320 feet at 10th.</p>",
    "shadowJump",
  ),
  prestigeFeature(
    "shadowdancer",
    "defensive-roll",
    "Defensive Roll",
    "<p>Once per day at 5th level, when a shadowdancer would be reduced to 0 or fewer hit points by a blow that isn't an instant kill, she can attempt a Reflex save (DC = the damage dealt) to take only half damage.</p>",
    "defensiveRoll",
  ),
  prestigeFeature(
    "shadowdancer",
    "improved-uncanny-dodge",
    "Improved Uncanny Dodge (Shadowdancer)",
    "<p>At 5th level, a shadowdancer can no longer be flanked, unless the attacker has at least four more rogue levels than she has shadowdancer levels (levels from other uncanny-dodge-granting classes stack for this purpose).</p>",
    "improvedUncannyDodgeShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "slippery-mind",
    "Slippery Mind",
    "<p>At 7th level, if a shadowdancer fails a Will save against an enchantment spell or effect, she can attempt a second save one round later to negate its effect.</p>",
    "slipperyMind",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-power",
    "Shadow Power",
    "<p>Once per day at 8th level (twice per day at 10th level), a shadowdancer can create quasi-real illusions of energy or other effects as shadow evocation, using her shadowdancer level as caster level.</p>",
    "shadowPower",
  ),
  prestigeFeature(
    "shadowdancer",
    "improved-evasion",
    "Improved Evasion (Shadowdancer)",
    "<p>At 10th level, a shadowdancer takes no damage on a successful Reflex save against an effect that normally deals half damage on a success, and only half damage even on a failed save, as long as she is wearing light or no armor.</p>",
    "improvedEvasionShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-master",
    "Shadow Master",
    "<p>At 10th level, while in an area of dim light, a shadowdancer gains DR 10/&mdash; and a +2 luck bonus on all saving throws; a critical hit she scores against a foe in dim light blinds that foe for 1d6 rounds.</p>",
    "shadowMaster",
  ),
];

/**
 * Student of War — the first prestige class here that isn't one of the CRB
 * ten. Adventurer's Guide (PZO1138) p. 142, originally Seekers of Secrets
 * (PZO9410) p. 62; the two printings are mechanically identical and the table
 * below was cross-checked line-for-line against both d20pfsrd and aonprd, the
 * same two-independent-sources method as the CRB batch.
 *
 * Tiers: full BAB, one good save (Will, `highPrestige` — 1,1,2,2,3,3,4,4,5,5)
 * and two poor (Fort/Ref, `lowPrestige` — 0,1,1,1,2,2,2,3,3,3). Both match the
 * published table exactly under the existing formulas, so this class needed no
 * new tier.
 *
 * Three features are more than prose:
 *   - **Mind Over Metal** is an ability *substitution* (Int in place of Dex for
 *     AC), not a bonus, so it can't be a `Change` — it is registered in the
 *     engine's `ability-substitution.ts` by name slug. Renaming this feature
 *     breaks that link; the engine test asserts the wiring end-to-end.
 *   - **Bonus Combat Feat** grants real feat slots via `bonusFeats`
 *     (1/2/3 at levels 2/5/8 = `floor((level + 1) / 3)`), rather than the
 *     prose-only posture the CRB batch took for Eldritch Knight's bonus combat
 *     feats — the progression is a plain function of level, so wiring it is
 *     trivially correct rather than a guess.
 *   - **Additional Skill** grants player-chosen class skills through the
 *     generic mechanism in the engine's `bonus-class-skills.ts`, also keyed by
 *     name slug — same renaming caveat as Mind Over Metal.
 */
const AG: SourceRef[] = [{ id: "PZO1138", pages: "142" }];

const STUDENT_OF_WAR_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "student-of-war",
    "additional-skill",
    "Additional Skill",
    "<p>At 1st level and every 2 levels thereafter (3rd, 5th, 7th, and 9th), a student of war gains a new class skill of her choice.</p><p><em>Choose the skills under Bonus Class Skills in the class builder; they count as class skills automatically.</em></p>",
    "additionalSkill",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "know-your-enemy",
    "Know Your Enemy",
    "<p>As a move action, a student of war can study a foe she can see and attempt a Knowledge check appropriate to the creature's type (DC = 10 + the target's HD). Success grants a +1 insight bonus against that enemy, applied through one of three stances chosen when the check is attempted: defensive (AC), martial (attack rolls), or tactical (CMB and CMD). The bonus increases to +2 at 4th level and +3 at 7th level, and at 7th level studying a foe becomes a swift action.</p>",
    "knowYourEnemy",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "bonus-combat-feat",
    "Bonus Combat Feat (SOW)",
    "<p>At 2nd, 5th, and 8th level, a student of war gains a bonus Combat feat. She must meet the prerequisites for the chosen feat.</p>",
    "bonusCombatFeatStudentOfWar",
    [{ formula: "floor((@class.unlevel + 1) / 3)", target: "bonusFeats", type: "untyped" }],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "mind-over-metal",
    "Mind Over Metal",
    "<p>At 2nd level, when a student of war is using armor or a shield, she can use her Intelligence modifier in place of her Dexterity modifier for determining her Armor Class.</p><p><em>Applied automatically while armor or a shield is equipped, and only when Intelligence is the better modifier. The armor's maximum Dexterity bonus still caps the substituted value.</em></p>",
    "mindOverMetal",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "anticipate",
    "Anticipate",
    "<p>At 3rd level, once per day as an immediate action, a student of war can ignore any damage and effects of a spell or ability she successfully saved against. She can use this ability one additional time per day at 6th level and again at 9th level.</p>",
    "anticipate",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "telling-blow",
    "Telling Blow",
    "<p>At 6th level, a student of war can aim her blows at the weakest point in a studied foe's defense, ignoring up to 5 points of damage reduction. She is also treated as having the Mobility feat when provoking attacks of opportunity from a studied foe.</p>",
    "tellingBlow",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "nemesis",
    "Nemesis",
    "<p>At 9th level, once per day as a swift action, a student of war can focus on a weapon she holds and render it anathema to her studied foe for 1 minute.</p>",
    "nemesis",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "deadly-blow",
    "Deadly Blow",
    "<p>At 10th level, a student of war can find weak spots where none should exist. When she uses her know your enemy ability and exceeds the Knowledge check DC by 10 or more, she ignores the target's natural damage reduction and its immunity to critical hits.</p>",
    "deadlyBlow",
    [],
    AG,
  ),
];

/** Hand-authored `ClassFeature`s granted by the two chunk-1 prestige classes. */
export const SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES: ClassFeature[] = [
  ...ELDRITCH_KNIGHT_FEATURES,
  ...MYSTIC_THEURGE_FEATURES,
  ...ARCANE_ARCHER_FEATURES,
  ...ARCANE_TRICKSTER_FEATURES,
  ...ASSASSIN_FEATURES,
  ...DRAGON_DISCIPLE_FEATURES,
  ...DUELIST_FEATURES,
  ...LOREMASTER_FEATURES,
  ...PATHFINDER_CHRONICLER_FEATURES,
  ...SHADOWDANCER_FEATURES,
  ...STUDENT_OF_WAR_FEATURES,
];

/**
 * Issue #66 chunk 4 — chassis for the eight remaining CRB prestige classes
 * (see the chunk-4 module doc comment above `ARCANE_ARCHER_FEATURES` for
 * sourcing/verification notes, the CRB-has-ten-not-nine correction, the
 * two-good-saves surprise, and the ability-score-increase `changes` posture).
 * Every entry below carries no armor/weapon proficiencies (published CRB
 * standard for all ten CRB prestige classes, EK/MT included).
 */
const CHUNK4_PRESTIGE_CLASSES: Class[] = [
  {
    id: "prestige:arcane-archer",
    name: "Arcane Archer",
    uuid: "prestige-class:arcane-archer",
    description:
      "<p>The arcane archer weaves ancient elven magic into her bow, turning ordinary arrows into instruments of devastating, supernatural precision.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "arcaneArcher",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "highPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 4,
    classSkills: ["per", "rid", "ste", "sur"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "arcane-archer", "enhance-arrows", "Enhance Arrows"),
      prestigeGrant(2, "arcane-archer", "imbue-arrow", "Imbue Arrow"),
      prestigeGrant(4, "arcane-archer", "seeker-arrow", "Seeker Arrow"),
      prestigeGrant(6, "arcane-archer", "phase-arrow", "Phase Arrow"),
      prestigeGrant(8, "arcane-archer", "hail-of-arrows", "Hail of Arrows"),
      prestigeGrant(10, "arcane-archer", "arrow-of-death", "Arrow of Death"),
    ],
    // Spells per Day column reads "—" at 1st, 5th, 9th and "+1 level of
    // existing arcane spellcasting class" every other level (verified
    // identically on legacy.aonprd.com and aonprd.com).
    castingAdvancement: [{ kind: "arcane", levels: [2, 3, 4, 6, 7, 8, 10] }],
    prereqs: {
      bab: 6,
      feats: ["Point-Blank Shot", "Precise Shot"],
      casting: [{ kind: "arcane", spellLevel: 1 }],
      prereqText:
        "Base Attack Bonus: +6. Feats: Point-Blank Shot, Precise Shot, Weapon Focus (longbow or shortbow). Spells: Ability to cast 1st-level arcane spells.",
    },
  },
  {
    id: "prestige:arcane-trickster",
    name: "Arcane Trickster",
    uuid: "prestige-class:arcane-trickster",
    description:
      "<p>The arcane trickster fuses arcane spellcasting with a rogue's guile, using magic to enhance her thievery, misdirection, and escapes.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "arcaneTrickster",
    subType: "prestige",
    hd: 6,
    bab: "low",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "highPrestige" },
    skillsPerLevel: 4,
    classSkills: [
      "acr",
      "apr",
      "blf",
      "clm",
      "dip",
      "dev",
      "dis",
      "esc",
      ...KNOWLEDGE_ALL,
      "per",
      "sen",
      "slt",
      "spl",
      "ste",
      "swm",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "arcane-trickster", "ranged-legerdemain", "Ranged Legerdemain"),
      prestigeGrant(2, "arcane-trickster", "sneak-attack", "Sneak Attack (Arcane Trickster)"),
      prestigeGrant(3, "arcane-trickster", "impromptu-sneak-attack", "Impromptu Sneak Attack"),
      prestigeGrant(5, "arcane-trickster", "tricky-spells", "Tricky Spells"),
      prestigeGrant(9, "arcane-trickster", "invisible-thief", "Invisible Thief"),
      prestigeGrant(10, "arcane-trickster", "surprise-spells", "Surprise Spells"),
    ],
    // Spells per Day reads "+1 level of existing class" at every level, 1-10.
    castingAdvancement: [{ kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    prereqs: {
      skillRanks: [
        { skill: "dev", ranks: 4 },
        { skill: "esc", ranks: 4 },
        { skill: "kar", ranks: 4 },
      ],
      casting: [{ kind: "arcane", spellLevel: 2 }],
      prereqText:
        "Alignment: Any nonlawful. Skills: Disable Device 4 ranks, Escape Artist 4 ranks, Knowledge (arcana) 4 ranks. Spells: Able to cast mage hand and at least one arcane spell of 2nd level or higher. Special: Sneak attack +2d6.",
    },
  },
  {
    id: "prestige:assassin",
    name: "Assassin",
    uuid: "prestige-class:assassin",
    description:
      "<p>The assassin turns murder into an art, blending stealth, poison, and a supernatural killing strike honed through cold-blooded training.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "assassin",
    subType: "prestige",
    hd: 8,
    bab: "med",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 4,
    classSkills: [
      "acr",
      "blf",
      "clm",
      "dip",
      "dev",
      "dis",
      "esc",
      "int",
      "lin",
      "per",
      "sen",
      "slt",
      "ste",
      "swm",
      "umd",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "assassin", "sneak-attack", "Sneak Attack (Assassin)"),
      prestigeGrant(1, "assassin", "death-attack", "Death Attack"),
      prestigeGrant(1, "assassin", "poison-use", "Poison Use (Assassin)"),
      prestigeGrant(2, "assassin", "save-bonus-against-poison", "Save Bonus Against Poison"),
      prestigeGrant(2, "assassin", "uncanny-dodge", "Uncanny Dodge (Assassin)"),
      prestigeGrant(4, "assassin", "hidden-weapons", "Hidden Weapons"),
      prestigeGrant(4, "assassin", "true-death", "True Death"),
      prestigeGrant(5, "assassin", "improved-uncanny-dodge", "Improved Uncanny Dodge (Assassin)"),
      prestigeGrant(6, "assassin", "quiet-death", "Quiet Death"),
      prestigeGrant(8, "assassin", "hide-in-plain-sight", "Hide in Plain Sight (Assassin)"),
      prestigeGrant(9, "assassin", "swift-death", "Swift Death"),
      prestigeGrant(10, "assassin", "angel-of-death", "Angel of Death"),
    ],
    prereqs: {
      skillRanks: [
        { skill: "dis", ranks: 2 },
        { skill: "ste", ranks: 5 },
      ],
      prereqText:
        "Alignment: Any evil. Skills: Disguise 2 ranks, Stealth 5 ranks. Special: The character must kill someone for no other reason than to become an assassin.",
    },
  },
  {
    id: "prestige:dragon-disciple",
    name: "Dragon Disciple",
    uuid: "prestige-class:dragon-disciple",
    description:
      "<p>The dragon disciple awakens the draconic blood within her, gradually taking on a dragon's toughness, strength, and elemental power.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "dragonDisciple",
    subType: "prestige",
    hd: 12,
    bab: "med",
    saves: { fort: "highPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 2,
    classSkills: ["dip", "esc", "fly", ...KNOWLEDGE_ALL, "per", "spl"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "dragon-disciple", "blood-of-dragons", "Blood of Dragons"),
      prestigeGrant(1, "dragon-disciple", "natural-armor", "Natural Armor"),
      prestigeGrant(2, "dragon-disciple", "strength-increase", "Strength Increase"),
      prestigeGrant(2, "dragon-disciple", "bloodline-feat", "Draconic Bloodline Feat"),
      prestigeGrant(2, "dragon-disciple", "dragon-bite", "Dragon Bite"),
      prestigeGrant(3, "dragon-disciple", "breath-weapon", "Breath Weapon"),
      // Second grant of the SAME feature (Strength Increase, +2 at 2nd AND
      // 4th) — see the chunk-4 module doc comment: two grants of one
      // `changes`-bearing feature correctly double the effect once both
      // levels are reached, without a second differently-named feature.
      prestigeGrant(4, "dragon-disciple", "strength-increase", "Strength Increase"),
      prestigeGrant(5, "dragon-disciple", "blindsense", "Blindsense"),
      prestigeGrant(6, "dragon-disciple", "constitution-increase", "Constitution Increase"),
      prestigeGrant(7, "dragon-disciple", "dragon-form", "Dragon Form"),
      prestigeGrant(8, "dragon-disciple", "intelligence-increase", "Intelligence Increase"),
      prestigeGrant(9, "dragon-disciple", "wings", "Wings"),
    ],
    // Spells per Day reads "—" at 1st, 5th, 9th and "+1 level arcane" every
    // other level (verified identically on legacy.aonprd.com and aonprd.com).
    castingAdvancement: [{ kind: "arcane", levels: [2, 3, 4, 6, 7, 8, 10] }],
    prereqs: {
      skillRanks: [{ skill: "kar", ranks: 5 }],
      casting: [{ kind: "arcane", spellLevel: 1 }],
      prereqText:
        "Race: Any nondragon. Skills: Knowledge (arcana) 5 ranks. Languages: Draconic. Spells: Ability to cast 1st-level arcane spells without preparation. A character with sorcerer levels must have the draconic bloodline, and any sorcerer levels gained after taking this class must also be in the draconic bloodline.",
    },
  },
  {
    id: "prestige:duelist",
    name: "Duelist",
    uuid: "prestige-class:duelist",
    description:
      "<p>The duelist is a master of finesse combat, turning speed, precision, and elegant swordplay into a deadly, mobile fighting style.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "duelist",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 4,
    classSkills: ["acr", "blf", "esc", "per", "prf", "sen"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "duelist", "canny-defense", "Canny Defense"),
      prestigeGrant(1, "duelist", "precise-strike", "Precise Strike"),
      prestigeGrant(2, "duelist", "improved-reaction", "Improved Reaction"),
      prestigeGrant(2, "duelist", "parry", "Parry"),
      prestigeGrant(3, "duelist", "enhanced-mobility", "Enhanced Mobility"),
      prestigeGrant(4, "duelist", "combat-reflexes", "Combat Reflexes (Duelist)"),
      prestigeGrant(4, "duelist", "grace", "Grace"),
      prestigeGrant(5, "duelist", "riposte", "Riposte"),
      prestigeGrant(6, "duelist", "acrobatic-charge", "Acrobatic Charge"),
      prestigeGrant(7, "duelist", "elaborate-defense", "Elaborate Defense"),
      prestigeGrant(9, "duelist", "deflect-arrows", "Deflect Arrows (Duelist)"),
      prestigeGrant(9, "duelist", "no-retreat", "No Retreat"),
      prestigeGrant(10, "duelist", "crippling-critical", "Crippling Critical"),
    ],
    prereqs: {
      bab: 6,
      feats: ["Dodge", "Mobility", "Weapon Finesse"],
      skillRanks: [
        { skill: "acr", ranks: 2 },
        { skill: "prf", ranks: 2 },
      ],
      prereqText:
        "Base Attack Bonus: +6. Skills: Acrobatics 2 ranks, Perform 2 ranks. Feats: Dodge, Mobility, Weapon Finesse.",
    },
  },
  {
    id: "prestige:loremaster",
    name: "Loremaster",
    uuid: "prestige-class:loremaster",
    description:
      "<p>The loremaster pursues knowledge for its own sake, accumulating secrets and lore that grant subtle but far-reaching supernatural insight.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "loremaster",
    subType: "prestige",
    hd: 6,
    bab: "low",
    saves: { fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 4,
    classSkills: ["apr", "dip", "han", "hea", ...KNOWLEDGE_ALL, "lin", "prf", "spl", "umd"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "loremaster", "secret", "Secret"),
      prestigeGrant(2, "loremaster", "lore", "Lore"),
      prestigeGrant(4, "loremaster", "bonus-languages", "Bonus Languages"),
      prestigeGrant(6, "loremaster", "greater-lore", "Greater Lore"),
      prestigeGrant(10, "loremaster", "true-lore", "True Lore"),
    ],
    // Spells per Day reads "+1 level of existing class" at every level, 1-10,
    // with NO arcane/divine restriction in the column text ("+1 level of
    // existing spellcasting class") — hence "any", unlike EK/MT/AT/DD's
    // arcane-only slots.
    castingAdvancement: [{ kind: "any", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    prereqs: {
      // Every requirement here is either an OR/"any N of" count (Knowledge
      // "any two", "any three metamagic or item creation feats") or a
      // parametrized Skill Focus target — none fits the flat
      // feats[]/skillRanks[] shape cleanly, so this class is prose-only.
      prereqText:
        "Skills: Knowledge (any two) 7 ranks in each. Feats: Any three metamagic or item creation feats, plus Skill Focus (Knowledge [any individual Knowledge skill]). Spells: Able to cast seven different divination spells, one of which must be 3rd level or higher.",
    },
  },
  {
    id: "prestige:pathfinder-chronicler",
    name: "Pathfinder Chronicler",
    uuid: "prestige-class:pathfinder-chronicler",
    description:
      "<p>The Pathfinder chronicler travels widely to record the deeds and discoveries of the Pathfinder Society, weaving bardic performance and scholarship together.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "pathfinderChronicler",
    subType: "prestige",
    hd: 8,
    bab: "med",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "highPrestige" },
    skillsPerLevel: 8,
    classSkills: [
      "apr",
      "blf",
      "dip",
      "dis",
      "esc",
      "int",
      ...KNOWLEDGE_ALL,
      "lin",
      "per",
      "prf",
      "rid",
      "sen",
      "slt",
      "sur",
      "umd",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(
        1,
        "pathfinder-chronicler",
        "bardic-knowledge",
        "Bardic Knowledge (Pathfinder Chronicler)",
      ),
      prestigeGrant(1, "pathfinder-chronicler", "deep-pockets", "Deep Pockets"),
      prestigeGrant(1, "pathfinder-chronicler", "master-scribe", "Master Scribe"),
      prestigeGrant(2, "pathfinder-chronicler", "live-to-tell-the-tale", "Live to Tell the Tale"),
      prestigeGrant(2, "pathfinder-chronicler", "pathfinding", "Pathfinding"),
      prestigeGrant(
        3,
        "pathfinder-chronicler",
        "bardic-performance",
        "Bardic Performance (Pathfinder Chronicler)",
      ),
      prestigeGrant(3, "pathfinder-chronicler", "improved-aid", "Improved Aid"),
      prestigeGrant(4, "pathfinder-chronicler", "epic-tales", "Epic Tales"),
      prestigeGrant(5, "pathfinder-chronicler", "whispering-campaign", "Whispering Campaign"),
      prestigeGrant(6, "pathfinder-chronicler", "inspire-action", "Inspire Action"),
      prestigeGrant(7, "pathfinder-chronicler", "call-down-the-legends", "Call Down the Legends"),
      prestigeGrant(8, "pathfinder-chronicler", "greater-epic-tales", "Greater Epic Tales"),
      prestigeGrant(
        10,
        "pathfinder-chronicler",
        "lay-of-the-exalted-dead",
        "Lay of the Exalted Dead",
      ),
    ],
    prereqs: {
      // Perform (oratory) and Profession (scribe) are parametrized subskill
      // requirements (no bare "prf"/"pro" SkillId match), so only the plain
      // Linguistics requirement is structured.
      skillRanks: [{ skill: "lin", ranks: 3 }],
      prereqText:
        "Skills: Linguistics 3 ranks, Perform (oratory) 5 ranks, Profession (scribe) 5 ranks. Special: Must have authored or scribed something (other than a magic scroll or similar device) for which another person (who is not a player character) paid at least 50 gp.",
    },
  },
  {
    id: "prestige:shadowdancer",
    name: "Shadowdancer",
    uuid: "prestige-class:shadowdancer",
    description:
      "<p>The shadowdancer forges a pact with the plane of shadow, gaining the ability to slip between shadows and command a shade of her own.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "shadowdancer",
    subType: "prestige",
    hd: 8,
    bab: "med",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 6,
    classSkills: ["acr", "blf", "dip", "dis", "esc", "per", "prf", "slt", "ste"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "shadowdancer", "hide-in-plain-sight", "Hide in Plain Sight (Shadowdancer)"),
      prestigeGrant(2, "shadowdancer", "evasion", "Evasion (Shadowdancer)"),
      prestigeGrant(2, "shadowdancer", "darkvision", "Darkvision"),
      prestigeGrant(2, "shadowdancer", "uncanny-dodge", "Uncanny Dodge (Shadowdancer)"),
      prestigeGrant(3, "shadowdancer", "rogue-talent", "Rogue Talent"),
      prestigeGrant(3, "shadowdancer", "shadow-illusion", "Shadow Illusion"),
      prestigeGrant(3, "shadowdancer", "summon-shadow", "Summon Shadow"),
      prestigeGrant(4, "shadowdancer", "shadow-call", "Shadow Call"),
      prestigeGrant(4, "shadowdancer", "shadow-jump", "Shadow Jump"),
      prestigeGrant(5, "shadowdancer", "defensive-roll", "Defensive Roll"),
      prestigeGrant(
        5,
        "shadowdancer",
        "improved-uncanny-dodge",
        "Improved Uncanny Dodge (Shadowdancer)",
      ),
      prestigeGrant(7, "shadowdancer", "slippery-mind", "Slippery Mind"),
      prestigeGrant(8, "shadowdancer", "shadow-power", "Shadow Power"),
      prestigeGrant(10, "shadowdancer", "improved-evasion", "Improved Evasion (Shadowdancer)"),
      prestigeGrant(10, "shadowdancer", "shadow-master", "Shadow Master"),
    ],
    prereqs: {
      feats: ["Combat Reflexes", "Dodge", "Mobility"],
      skillRanks: [{ skill: "ste", ranks: 5 }],
      prereqText:
        "Skills: Stealth 5 ranks, Perform (dance) 2 ranks. Feats: Combat Reflexes, Dodge, Mobility.",
    },
  },
];

/**
 * Hand-authored prestige `Class` chassis. See the module doc comment above
 * this section for sourcing/verification notes; chassis numbers verified
 * against legacy.aonprd.com raw HTML (levels 1-10):
 *
 * Eldritch Knight — d10 HD, full (`"high"`) BAB, good Fort (`highPrestige`:
 * 1,1,2,2,3,3,4,4,5,5), poor Ref/Will (`lowPrestige`: 0,1,1,1,2,2,2,3,3,3),
 * 2 + Int skill ranks/level, no armor/weapon proficiencies, one arcane
 * casting-advancement slot starting at 2nd level (the table's Spells per Day
 * column reads "—" at 1st level, "+1 level of existing arcane spellcasting
 * class" from 2nd on).
 *
 * Mystic Theurge — d6 HD, half (`"low"`) BAB, good Will (`highPrestige`),
 * poor Fort/Ref (`lowPrestige`), 2 + Int skill ranks/level, no armor/weapon
 * proficiencies, two casting-advancement slots (one arcane, one divine) BOTH
 * starting at 1st level.
 */
export const SUPPLEMENTAL_PRESTIGE_CLASSES: Class[] = [
  {
    id: "prestige:eldritch-knight",
    name: "Eldritch Knight",
    uuid: "prestige-class:eldritch-knight",
    description:
      "<p>The eldritch knight combines martial training with arcane spellcasting, blending blade and spell into a single, versatile fighting style.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "eldritchKnight",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "highPrestige", ref: "lowPrestige", will: "lowPrestige" },
    skillsPerLevel: 2,
    classSkills: ["clm", "kar", "kno", "lin", "rid", "sen", "spl", "swm"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "eldritch-knight", "diverse-training", "Diverse Training"),
      prestigeGrant(1, "eldritch-knight", "bonus-combat-feat", "Bonus Combat Feat"),
      prestigeGrant(10, "eldritch-knight", "spell-critical", "Spell Critical"),
    ],
    castingAdvancement: [{ kind: "arcane", levels: [2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    prereqs: {
      casting: [{ kind: "arcane", spellLevel: 3 }],
      prereqText:
        "Weapon Proficiency: Must be proficient with all martial weapons. Spells: Able to cast 3rd-level arcane spells.",
    },
  },
  {
    id: "prestige:mystic-theurge",
    name: "Mystic Theurge",
    uuid: "prestige-class:mystic-theurge",
    description:
      "<p>The mystic theurge draws on both arcane and divine sources of magic, advancing two separate spellcasting traditions side by side.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "mysticTheurge",
    subType: "prestige",
    hd: 6,
    bab: "low",
    saves: { fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 2,
    classSkills: ["kar", "kre", "sen", "spl"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "mystic-theurge", "combined-spells", "Combined Spells"),
      prestigeGrant(10, "mystic-theurge", "spell-synthesis", "Spell Synthesis"),
    ],
    castingAdvancement: [
      { kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { kind: "divine", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
    prereqs: {
      skillRanks: [
        { skill: "kar", ranks: 3 },
        { skill: "kre", ranks: 3 },
      ],
      casting: [
        { kind: "arcane", spellLevel: 2 },
        { kind: "divine", spellLevel: 2 },
      ],
      prereqText:
        "Skills: Knowledge (arcana) 3 ranks, Knowledge (religion) 3 ranks. Spells: Able to cast 2nd-level divine spells and 2nd-level arcane spells.",
    },
  },
  ...CHUNK4_PRESTIGE_CLASSES,
  {
    id: "prestige:student-of-war",
    name: "Student of War",
    uuid: "prestige-class:student-of-war",
    description:
      "<p>The student of war treats battle as a subject to be studied rather than a craft to be drilled, reading her enemies as readily as she reads a manual and turning what she knows into openings no one else can see.</p>",
    sources: AG,
    tag: "studentOfWar",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 6,
    classSkills: [
      "clm",
      "crf",
      "dev",
      "han",
      ...KNOWLEDGE_ALL,
      "lin",
      "per",
      "pro",
      "sen",
      "spl",
      "sur",
      "swm",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "student-of-war", "additional-skill", "Additional Skill"),
      prestigeGrant(1, "student-of-war", "know-your-enemy", "Know Your Enemy"),
      prestigeGrant(2, "student-of-war", "bonus-combat-feat", "Bonus Combat Feat (SOW)"),
      prestigeGrant(2, "student-of-war", "mind-over-metal", "Mind Over Metal"),
      prestigeGrant(3, "student-of-war", "anticipate", "Anticipate"),
      prestigeGrant(6, "student-of-war", "telling-blow", "Telling Blow"),
      prestigeGrant(9, "student-of-war", "nemesis", "Nemesis"),
      prestigeGrant(10, "student-of-war", "deadly-blow", "Deadly Blow"),
    ],
    prereqs: {
      // Combat Expertise and Dodge are plain named feats, so they hard-block.
      // The rest stay advisory for the reasons the hybrid model already
      // enumerates: Skill Focus (any Knowledge) and Knowledge (any two) are
      // parametrized/OR requirements, martial-weapon proficiency counts
      // *any two* of a category rather than a named grant, and the
      // five-creatures requirement is pure table history.
      bab: 5,
      feats: ["Combat Expertise", "Dodge"],
      prereqText:
        "Base Attack Bonus: +5. Feats: Combat Expertise, Dodge, Skill Focus (any one Knowledge skill). Proficiency: Must be proficient with two martial weapons. Skills: Knowledge (any two) 4 ranks in each. Special: Must have succeeded at Knowledge checks against five distinct creatures prior to defeating them.",
    },
  },
];

/**
 * Append `SUPPLEMENTAL_PRESTIGE_CLASSES`/`SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES`
 * onto the already-normalized vendored lists, in place. Throws loudly (rather
 * than silently overwriting or duplicating) if a future data bump ever
 * introduces a real class/feature whose id, uuid, tag, or name collides with
 * one of these synthetic entries — the same "fail the build" posture as
 * `resolveBloodlineSupplements`.
 */
export function applyPrestigeClassSupplements(
  classes: Class[],
  classFeatures: ClassFeature[],
): void {
  for (const cls of SUPPLEMENTAL_PRESTIGE_CLASSES) {
    const collision = classes.find(
      (c) => c.id === cls.id || c.uuid === cls.uuid || c.tag === cls.tag || c.name === cls.name,
    );
    if (collision) {
      throw new Error(
        `[supplements] prestige class "${cls.name}" collides with vendored class "${collision.name}" (id=${collision.id})`,
      );
    }
    classes.push(cls);
  }
  for (const feature of SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES) {
    const collision = classFeatures.find(
      (f) => f.id === feature.id || f.uuid === feature.uuid || f.name === feature.name,
    );
    if (collision) {
      throw new Error(
        `[supplements] prestige class feature "${feature.name}" collides with vendored class feature "${collision.name}" (id=${collision.id})`,
      );
    }
    classFeatures.push(feature);
  }
}

/**
 * Heritage-variant racial traits whose published replacement ability array
 * exists only as description prose upstream (the pack ships them with empty
 * `changes[]`). Each entry hand-authors that array so the engine's
 * `VENDORED_STANDARD_TRAIT_TARGETS` "Base Statistics" suppression can safely
 * retire the base race's array: without a landing replacement, suppression
 * would zero the character's racial modifiers, which is why these stayed
 * unmapped until now.
 *
 * Keyed by trait **id** (heritage names repeat across race packs). `name` is
 * verified on apply, and `keyword` is the entry's own vendored
 * "Ability Modifiers" prose line, verbatim — the drift guard that fails the
 * build if a data bump ever changes the published array out from under the
 * hand-authored one. Changes are typed `racial` to match the base race's
 * array, so even if suppression were somehow bypassed the same-type overlap
 * takes-highest instead of summing.
 *
 * The Skinwalker "-Kin" entries carry a third, gated `Change` for their
 * "+2 X while shapechanged" clause on top of the always-on pair: `Change.
 * activeWhenBuff` (issue #75, `@pf1/engine` collect.ts's `buffGateSatisfied`)
 * scopes it to `SKINWALKER_CHANGE_SHAPE_GATE`, an `effectTag` the web app's
 * `model/skinwalker.ts` toggles on a player-controlled marker buff (there is
 * no vendored "Change Shape" buff to key a real `buffId` off, the same "no
 * vendored buff to link" shape as `@pf1/engine` `toggle-buffs.ts`). Each
 * heritage's fixed ability target (Str/Dex/Con/Wis/Cha, per its own prose,
 * not restricted to the base race's physical-ability-only rule) is typed
 * `racial` like its sibling half of the same line.
 */
const SKINWALKER_CHANGE_SHAPE_GATE: BuffGate = { effectTags: ["skinwalker:changeShape"] };

export const SUPPLEMENTAL_RACIAL_TRAIT_CHANGES: Record<
  string,
  { name: string; keyword: string; changes: Change[] }
> = {
  "0iFqZXfHNt2vAJ8h": {
    name: "Div-Spawn (Spitespawn)",
    keyword: "+2 Dex, +2 Cha, -2 Int",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
    ],
  },
  BgNdXPtHRUJOuPwF: {
    name: "Oni-Spawn (Hungerseed)",
    keyword: "+2 Str, +2 Wis, -2 Cha",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "cha", type: "racial" },
    ],
  },
  JLGJMVewolF9XNVW: {
    name: "Rakshasa-Spawn (Beastbrood)",
    keyword: "+2 Dex, +2 Cha, -2 Wis",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  NBmeuhkyRCjD3kV4: {
    name: "Asura-Spawn (Faultspawn)",
    keyword: "+2 Dex, +2 Wis, -2 Int",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
    ],
  },
  UMT2CcRjz9uXlsvb: {
    name: "Kyton-Spawn (Shackleborn)",
    keyword: "+2 Con, +2 Cha, -2 Wis",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  emgcgmgSjpuv1GHa: {
    name: "Demon-Spawn (Pitborn)",
    keyword: "+2 Str, +2 Cha, -2 Int",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
    ],
  },
  iWZjiKTQnGS5XnB0: {
    name: "Qlippoth-Spawn (the Motherless)",
    keyword: "+2 Str, +2 Wis, -2 Int",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
    ],
  },
  izCRmMUEyikdfpiq: {
    name: "Devil-Spawn (Hellspawn)",
    keyword: "+2 Con, +2 Wis, -2 Cha",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "cha", type: "racial" },
    ],
  },
  zaQk4Qx8fsdxsOSW: {
    name: "Demodand-Spawn (Foulspawn)",
    keyword: "+2 Con, +2 Wis, -2 Int",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
    ],
  },
  zlOXohhDPfhgEstJ: {
    name: "Daemon-Spawn (Grimspawn)",
    keyword: "+2 Dex, +2 Int, -2 Wis",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  "3haIOIRYDeFc1YZH": {
    name: "Archon-Blooded (Lawbringers)",
    keyword: "+2 Con, +2 Wis",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
    ],
  },
  KEXruHT9nIp41wT1: {
    name: "Peri-Blooded (Emberkin)",
    keyword: "+2 Int, +2 Cha",
    changes: [
      { formula: "2", target: "int", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
    ],
  },
  R7UDXRs0E5klyzCY: {
    name: "Garuda-Blooded (Plumekith)",
    keyword: "+2 Dex, +2 Wis",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
    ],
  },
  TbnWNAk91q2wgqCP: {
    name: "Angel-Blooded (Angelkin)",
    keyword: "+2 Str, +2 Cha",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
    ],
  },
  U8dkiXDmSDOETLxv: {
    name: "Azata-Blooded (Musetouched)",
    keyword: "+2 Dex, +2 Cha",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
    ],
  },
  nPKsivL973H9L7y7: {
    name: "Agathion-Blooded (Idyllkin)",
    keyword: "+2 Con, +2 Cha",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
    ],
  },
  Ni5twdUyps9MQyOX: {
    name: "Jiang-Shi Born (Ru-Shi)",
    keyword: "+2 Str, +2 Int, -2 Dex",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "dex", type: "racial" },
    ],
  },
  SFD4dGofogr1c1S9: {
    name: "Nosferatu-Born (Ancient-Born)",
    keyword: "+2 Strength, +2 Wisdom, -2 Constitution",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "con", type: "racial" },
    ],
  },
  f91ILsrKfkpL9uUG: {
    name: "Moroi-Born (Svetocher)",
    keyword: "+2 Strength, +2 Charisma, -2 Constitution",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "con", type: "racial" },
    ],
  },
  yodj1nKWZ1hzQVVv: {
    name: "Vetala-Born (Ajibachana)",
    keyword: "+2 Dex, +2 Int, -2 Wis",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  WE57FyExdDq2mjnV: {
    name: "Sunsoul (Solar Ifrit)",
    keyword: "+2 Str, +2 Cha, -2 Wis",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  jAQXQDgwCX0eKxZ2: {
    name: "Lavasoul (Magma Ifrit)",
    keyword: "+2 Con, +2 Int, -2 Dex",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "dex", type: "racial" },
    ],
  },
  Hp26XuRpA7QNUOZO: {
    name: "Ironsoul (Metal Oread)",
    keyword: "+2 Con, +2 Wis, -2 Dex",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "dex", type: "racial" },
    ],
  },
  a1otKF9eFw6gSfvB: {
    name: "Gemsoul (Crystal Oread)",
    keyword: "+2 Str, +2 Cha, -2 Wis",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  DFWkrIYLx6L7Vs6W: {
    name: "Smokesoul (Fume Sylph)",
    keyword: "+2 Dex, +2 Cha, -2 Con",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "con", type: "racial" },
    ],
  },
  kLPypNzy62fMbj3d: {
    name: "Stormsoul (Lightning Sylph)",
    keyword: "+2 Dex, +2 Cha, -2 Wis",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "cha", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
    ],
  },
  "0CISUAPF2V91vvoo": {
    name: "Rimesoul (Frost Undine)",
    keyword: "+2 Dex, +2 Int, -2 Cha",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "cha", type: "racial" },
    ],
  },
  yRISJZyDwhGV0jFO: {
    name: "Mistsoul (Vapor Undine)",
    keyword: "+2 Con, +2 Wis, -2 Int",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
    ],
  },
  // The vendored description's own "Ability Modifiers" line reads "+2 Wis,
  // -2 Cha" (matched verbatim by `keyword` below, so the drift guard still
  // checks against what the pack actually says) — but the published
  // Ragebred heritage (Inner Sea Races p. 249 / Blood of the Moon p. 8-24,
  // verified against aonprd.com) is "+2 Strength, -2 Charisma (+2
  // Constitution while shapechanged)": the Cha penalty and the shapechanged
  // Con bonus both match, only the primary +2 stat is mistyped upstream
  // (Wis instead of Str). Authored as the real RAW value, same posture as
  // this file's other wrong-vendored-formula corrections (Smite Evil, AC
  // Bonus (BRA)).
  Mb0hz0BAj51wOmUr: {
    name: "Wereboar-Kin (Ragebred)",
    keyword: "+2 Wis, -2 Cha (+2 Con while shapechanged)",
    changes: [
      { formula: "2", target: "str", type: "racial" },
      { formula: "-2", target: "cha", type: "racial" },
      { formula: "2", target: "con", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  S2fAbQom6ogn4gh9: {
    name: "Wereraptor-Kin (Aerieborn)",
    keyword: "+2 Wis, -2 Cha (+2 Dex while shapechanged)",
    changes: [
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "cha", type: "racial" },
      { formula: "2", target: "dex", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  ZLFxIufcHBwiIZrl: {
    name: "Werebear-Kin (Coldborn)",
    keyword: "+2 Con, -2 Cha (+2 Wis while shapechanged)",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "-2", target: "cha", type: "racial" },
      { formula: "2", target: "wis", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  calSa82WwxgUFwXr: {
    name: "Werewolf-Kin (Witchwolf)",
    keyword: "+2 Con, -2 Int (+2 Wis while shapechanged)",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
      { formula: "2", target: "wis", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  mBfn8hCLwEsAxlnl: {
    name: "Werebat-Kin (Bloodmarked)",
    keyword: "+2 Int, -2 Wis (+2 Dex while shapechanged)",
    changes: [
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
      { formula: "2", target: "dex", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  mNPzfPRAdgvumhww: {
    name: "Wererat-Kin (Nightskulk)",
    keyword: "+2 Int, -2 Str (+2 Dex while shapechanged)",
    changes: [
      { formula: "2", target: "int", type: "racial" },
      { formula: "-2", target: "str", type: "racial" },
      { formula: "2", target: "dex", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  nopyUgzhxcD4G8uD: {
    name: "Weretiger-Kin (Fanglord)",
    keyword: "+2 Dex, -2 Wis (+2 Cha while shapechanged)",
    changes: [
      { formula: "2", target: "dex", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
      { formula: "2", target: "cha", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  // Same shape as Ragebred above: the vendored description's own "Ability
  // Modifiers" line reads "+2 Int, -2 Wis" (matched verbatim by `keyword`),
  // but the published Scaleheart heritage (verified against aonprd.com) is
  // "+2 Constitution, -2 Wisdom (+2 Strength while shapechanged)" — only the
  // primary +2 stat is mistyped upstream (Int instead of Con).
  uj0JvFUtrmpOSNVa: {
    name: "Werecrocodile-Kin (Scaleheart)",
    keyword: "+2 Int, -2 Wis (+2 Str while shapechanged)",
    changes: [
      { formula: "2", target: "con", type: "racial" },
      { formula: "-2", target: "wis", type: "racial" },
      { formula: "2", target: "str", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
  wrqUJsULTxngAMQb: {
    name: "Wereshark-Kin (Seascarred)",
    keyword: "+2 Wis, -2 Int (+2 Con while shapechanged)",
    changes: [
      { formula: "2", target: "wis", type: "racial" },
      { formula: "-2", target: "int", type: "racial" },
      { formula: "2", target: "con", type: "racial", activeWhenBuff: SKINWALKER_CHANGE_SHAPE_GATE },
    ],
  },
};

/**
 * Apply `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` in place. Guards, all of which
 * fail the build loudly on a data bump that drifts: the id must exist, the
 * name must match, the entry's own description must still contain the exact
 * prose line the array was transcribed from, and the vendored `changes` must
 * still be empty (if upstream ever ships real arrays, the supplement must be
 * retired rather than fought).
 */
export function applyRacialTraitChangesSupplements(traits: RacialTrait[]): void {
  const byId = new Map(traits.map((t) => [t.id, t]));
  for (const [id, s] of Object.entries(SUPPLEMENTAL_RACIAL_TRAIT_CHANGES)) {
    const trait = byId.get(id);
    if (trait === undefined) {
      throw new Error(`[supplements] racial trait "${s.name}" (${id}) not found in vendored set`);
    }
    if (trait.name !== s.name) {
      throw new Error(
        `[supplements] racial trait ${id} is now named "${trait.name}", expected "${s.name}"`,
      );
    }
    const prose = (trait.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    if (!prose.includes(s.keyword)) {
      throw new Error(
        `[supplements] racial trait "${s.name}" (${id}) description no longer contains "${s.keyword}" — re-verify the published array before re-authoring`,
      );
    }
    if (trait.changes.length > 0) {
      throw new Error(
        `[supplements] racial trait "${s.name}" (${id}) now carries vendored changes — retire its supplement entry`,
      );
    }
    trait.changes = s.changes;
  }
}

/**
 * Racial traits that are pure by-reference aliases of another modeled trait,
 * shipped inert upstream. The one entry so far: Versatile Human's whole
 * published text is "Replace the +2 bonus to any ability score, the skilled
 * racial trait, and the bonus feat racial trait with dual talent" — so it
 * receives Dual Talent's two open +2 changes and its replaced-trait names
 * (the pack labels it only "Base Statistics", which for Human is the inert
 * bundle tag). Same drift-guard posture as
 * `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES`.
 */
export const SUPPLEMENTAL_RACIAL_TRAIT_ALIASES: Record<
  string,
  { name: string; keyword: string; openChanges: Change[]; replacedTraitNames: string[] }
> = {
  quudBE0oHTdD4ulL: {
    name: "Versatile Human",
    keyword: "with dual talent",
    openChanges: [
      { formula: "2", target: "", type: "racial" },
      { formula: "2", target: "", type: "racial" },
    ],
    replacedTraitNames: ["+2 to One Ability Score", "Bonus Feat", "Skilled"],
  },
};

/** Apply `SUPPLEMENTAL_RACIAL_TRAIT_ALIASES` in place, same guards as above. */
export function applyRacialTraitAliasSupplements(traits: RacialTrait[]): void {
  const byId = new Map(traits.map((t) => [t.id, t]));
  for (const [id, s] of Object.entries(SUPPLEMENTAL_RACIAL_TRAIT_ALIASES)) {
    const trait = byId.get(id);
    if (trait === undefined) {
      throw new Error(`[supplements] racial trait "${s.name}" (${id}) not found in vendored set`);
    }
    if (trait.name !== s.name) {
      throw new Error(
        `[supplements] racial trait ${id} is now named "${trait.name}", expected "${s.name}"`,
      );
    }
    const prose = (trait.description ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
    if (!prose.includes(s.keyword)) {
      throw new Error(
        `[supplements] racial trait "${s.name}" (${id}) description no longer says "${s.keyword}" — re-verify before re-aliasing`,
      );
    }
    if ((trait.openChanges ?? []).length > 0 || trait.changes.length > 0) {
      throw new Error(
        `[supplements] racial trait "${s.name}" (${id}) now carries vendored changes — retire its alias entry`,
      );
    }
    trait.openChanges = s.openChanges;
    trait.replacedTraitNames = s.replacedTraitNames;
  }
}

/**
 * Whole hand-authored gear entries for published items the Foundry `items` pack
 * simply doesn't carry — the item counterpart to
 * {@link SUPPLEMENTAL_PRESTIGE_CLASSES} (a new entity, not a patch onto a
 * vendored one; for the latter see `@pf1/engine`'s `ITEM_CHANGE_PATCHES`).
 *
 * Synthetic `item:`/`supplement-item:` ids never collide with Foundry's
 * generated ones and, unlike them, survive a data bump — a character's saved
 * `build.gear[].itemId` keeps resolving.
 *
 * An entry whose published effect the engine has no model for carries an empty
 * `changes[]` rather than an invented approximation (the standing no-fake-
 * mechanics rule); it's still selectable, priced, weighed, and readable on the
 * reference site, which is what the request is for.
 */
export const SUPPLEMENTAL_ITEMS: Item[] = [
  {
    // Boots of the Cat (Ultimate Equipment p. 229). Falling damage isn't
    // modeled anywhere in the engine, so there is nothing to encode: the whole
    // effect is a floor on damage dice the tracker never rolls.
    id: "item:boots-of-the-cat",
    name: "Boots of the Cat",
    uuid: "supplement-item:boots-of-the-cat",
    description:
      "<p>These high-soled boots provide a great deal of comfort and arch support while also making the wearer appear a little bit taller than normal. The wearer always takes the minimum possible damage from a fall (as if the GM had rolled a 1 on each die of damage incurred by the fall), and at the end of a fall always lands on her feet.</p>",
    sources: [{ id: "PZO1123", pages: "229" }],
    subType: "wondrous",
    slot: "feet",
    price: 1000,
    weight: 1,
    cl: 1,
    aura: { school: "trs" },
    changes: [],
    contextNotes: [],
  },
];

/**
 * Push {@link SUPPLEMENTAL_ITEMS} onto the vendored item list, failing the
 * build if upstream has since started shipping one of them (at which point the
 * entry should be retired rather than shadowing the real thing).
 */
export function applyItemSupplements(items: Item[]): void {
  for (const item of SUPPLEMENTAL_ITEMS) {
    const collision = items.find(
      (it) => it.id === item.id || it.uuid === item.uuid || it.name === item.name,
    );
    if (collision) {
      throw new Error(
        `[supplements] item "${item.name}" collides with vendored item "${collision.name}" (id=${collision.id}) — retire the supplement`,
      );
    }
    items.push(item);
  }
}

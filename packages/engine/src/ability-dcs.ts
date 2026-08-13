/**
 * Enemy-facing ability DCs the CHARACTER inflicts on a target — the "10 + 1/2
 * class level + ability mod" family: witch/shaman hex, channel energy,
 * alchemist bomb, antipaladin cruelty, mesmerist trick, Stunning Fist,
 * Quivering Palm. Distinct from `saves`/`cmb`/`cmd` (which resist an
 * incoming effect) and from `feature-save-dc.ts` (which only rewrites prose
 * in a class-feature's own `contextNotes`) — this module computes real
 * numbers onto `DerivedSheet.abilityDCs` and gives DC-modifying feats/traits
 * a `Change.target` to land on (`abilityDC.<family>`, registered in
 * `targets.ts`).
 *
 * Mirrors `maneuver-categories.ts`'s shape (a small fixed vocabulary, a
 * `resolveStack` fold per key) but the output is a list of ABSOLUTE DC
 * lines, not deltas held out of a headline total — there is no "headline
 * ability DC" for these seven abilities to be held out of.
 */

import type { AbilityId, CharacterDoc, DerivedAbilityDC, RefData } from "@pf1/schema";

import { forTarget, type CollectedModifier } from "./collect.js";
import { featNameSlug } from "./feat-effects.js";
import { tryEvaluateFormula, type RollData } from "./formula.js";
import { totalLevel, type AbilityView } from "./rolldata.js";
import { resolveStack } from "./stacking.js";
import { antipaladinCrueltyDC, witchHexDC } from "./tables.js";

export interface AbilityDCFamily {
  /** Player-facing label, e.g. "Hex". Combined with " DC" for the sheet line. */
  label: string;
}

/**
 * The seven families this engine computes a real DC for. Keys double as the
 * `abilityDC.<key>` `Change.target` suffix (see `targets.ts`).
 */
export const ABILITY_DC_FAMILIES: Readonly<Record<string, AbilityDCFamily>> = {
  hex: { label: "Hex" },
  channel: { label: "Channel Energy" },
  bomb: { label: "Bomb" },
  cruelty: { label: "Cruelty" },
  mesmeristTrick: { label: "Mesmerist Trick" },
  stunningFist: { label: "Stunning Fist" },
  quiveringPalm: { label: "Quivering Palm" },
};

const FAMILY_ORDER: readonly string[] = Object.keys(ABILITY_DC_FAMILIES);

/** The `Change.target` string for a modifier scoped to one ability-DC family (e.g. `"abilityDC.hex"`). */
export function abilityDCTarget(key: string): string {
  return `abilityDC.${key}`;
}

/** `10 + 1/2 level + mod`, the shape every family here uses. `null` below level 1 (nothing to show). */
function stdDC(level: number, mod: number): number | null {
  return level > 0 ? 10 + Math.floor(level / 2) + mod : null;
}

function classLevel(doc: CharacterDoc, tag: string): number {
  return doc.identity.classes.find((c) => c.tag === tag)?.level ?? 0;
}

/** Vendored class display name (e.g. "Witch"), falling back to the bare tag if the class isn't in this data slice. */
function classDisplayName(refData: RefData, tag: string): string {
  return Object.values(refData.classes).find((c) => c.tag === tag)?.name ?? tag;
}

/** True when `doc.build.feats` contains a feat whose name slugs to `slug` (see `feat-effects.ts`'s `featNameSlug`). */
function hasFeatSlug(doc: CharacterDoc, refData: RefData, slug: string): boolean {
  for (const featId of doc.build.feats ?? []) {
    const feat = refData.feats[featId];
    if (feat && featNameSlug(feat.name) === slug) return true;
  }
  return false;
}

/**
 * One family instance before cross-instance disambiguation/modifier folding
 * — e.g. a witch's hex DC and a shaman's hex DC are two separate instances of
 * the `"hex"` family. `classTag` is the granting class's tag (used both to
 * build the display label and, for the two families a `feature-save-dc.ts`
 * phrase maps onto, to pick the exact instance that phrase means — see
 * `computeAbilityDCs`'s `familyDCs` construction).
 */
interface RawInstance {
  key: string;
  classTag: string;
  classLabel: string;
  /** DC before any `abilityDC.<key>`-targeted modifier. */
  base: number;
  save?: string;
}

/**
 * Cleric Wisdom house-rule alias (default off), duplicated in miniature from
 * `resources.ts`'s function of the same name — that module is a display-only
 * concern this module deliberately doesn't touch (see `ability-dcs.ts`'s
 * design brief). Returns a COPY of `data` with `abilities.cha` aliased to
 * `abilities.wis`'s values, scoped to a single formula evaluation; a
 * malformed/missing `abilities.wis` shape no-ops rather than throwing.
 */
function withClericWisdomHouserule(data: RollData): RollData {
  const abilities = data.abilities;
  if (!abilities || typeof abilities !== "object") return data;
  const wis = (abilities as Record<string, unknown>).wis;
  if (!wis || typeof wis !== "object") return data;
  return { ...data, abilities: { ...abilities, cha: { ...wis } } };
}

/**
 * Channel Energy (and its reflavors) instances: cleric's own "Channel
 * Energy", paladin's "Channel Positive Energy" (4th), warpriest's "Channel
 * Energy (WAR)", antipaladin's "Channel Negative Energy" — every base-class
 * grant whose vendored feature name matches this shape AND carries an
 * `actions[].save.dcFormula`. Reuses the vendored dcFormula (evaluated with
 * `@class.unlevel` set to the GRANTING class's level, same convention
 * `resources.ts`'s `processGrant` and `archetypes.ts`'s domain/school grants
 * use) rather than hand-computing, since it already generalizes correctly
 * across all four classes without four separate hand-authored formulas (the
 * warpriest's, uniquely, keys off Wisdom instead of Charisma — reusing the
 * vendored formula gets that right for free). Domain/school/archetype-only
 * channel grants are out of scope — every one of the four classes above
 * grants Channel Energy as a base-class feature, so only `classDef.features`
 * (not `collectGrantedFeatures`'s domain/school fan-out) needs walking.
 */
function channelInstances(doc: CharacterDoc, refData: RefData, rollData: RollData): RawInstance[] {
  const out: RawInstance[] = [];
  const clericWisdomHouserule = doc.build.settings?.clericWisdomHouserule ?? false;
  for (const cls of doc.identity.classes) {
    if (cls.level <= 0) continue;
    const classDef = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    if (!classDef) continue;
    for (const grant of classDef.features) {
      if (grant.level > cls.level || !grant.resolved) continue;
      const feature = refData.classFeatures[grant.featureId];
      if (
        !feature ||
        !/^Channel (Energy|Positive Energy|Negative Energy)( \(WAR\))?$/.test(feature.name)
      ) {
        continue;
      }
      const action = feature.actions?.find((a) => a.save?.dcFormula);
      if (!action?.save?.dcFormula) continue;
      let featureRollData: RollData = {
        ...rollData,
        class: { level: cls.level, unlevel: cls.level },
      };
      if (clericWisdomHouserule && cls.tag === "cleric") {
        featureRollData = withClericWisdomHouserule(featureRollData);
      }
      let dc: number | null;
      try {
        dc = tryEvaluateFormula(action.save.dcFormula, featureRollData);
      } catch {
        continue;
      }
      if (dc === null || Number.isNaN(dc)) continue;
      out.push({
        key: "channel",
        classTag: cls.tag,
        classLabel: classDef.name,
        base: Math.round(dc),
        save: "Will",
      });
    }
  }
  return out;
}

/**
 * Every family instance the character currently qualifies for — gated on the
 * granting class's level (or, for Stunning Fist, either monk levels or the
 * feat itself), never crashing on a stale/unknown build field. See each
 * family's inline comment for its rulebook source and any level gate that
 * needed verifying against the vendored class data.
 */
function rawInstances(
  doc: CharacterDoc,
  refData: RefData,
  abilities: Record<AbilityId, AbilityView>,
  rollData: RollData,
): RawInstance[] {
  const out: RawInstance[] = [];

  // Hex — witch (APG, hexes from 1st level; `witchHexDC` = 10 + 1/2 witch
  // level + Int mod, per the APG hex rules) and shaman (ACG; hexes granted by
  // the "Hex (SHA)" class feature starting at 2ND level per the vendored
  // shaman class-feature list, one level later than the witch — the shaman's
  // own class feature carries no dcFormula of its own to reuse, so this is
  // hand-computed off the same `10 + 1/2 level + Wis mod` shape the witch's
  // formula uses, substituting Wisdom for the shaman's Wis-based casting).
  const witchLevel = classLevel(doc, "witch");
  if (witchLevel > 0) {
    out.push({
      key: "hex",
      classTag: "witch",
      classLabel: classDisplayName(refData, "witch"),
      base: witchHexDC(witchLevel, abilities.int.mod),
    });
  }
  const shamanLevel = classLevel(doc, "shaman");
  if (shamanLevel >= 2) {
    const dc = stdDC(shamanLevel, abilities.wis.mod);
    if (dc !== null) {
      out.push({
        key: "hex",
        classTag: "shaman",
        classLabel: classDisplayName(refData, "shaman"),
        base: dc,
      });
    }
  }

  // Channel Energy and its reflavors — see channelInstances's doc comment.
  out.push(...channelInstances(doc, refData, rollData));

  // Bomb — alchemist (APG), DC 10 + 1/2 alchemist level + Int mod; matches
  // the vendored Bomb feature's own `save.dcFormula`
  // ("10 + floor(@class.unlevel / 2) + @abilities.int.mod"), hand-computed
  // here rather than evaluated for consistency with the other hand-tabled
  // families (`tables.ts`'s `bombDamageDetail` already hand-computes the
  // dice for the same reason).
  const alchemistLevel = classLevel(doc, "alchemist");
  if (alchemistLevel > 0) {
    const dc = stdDC(alchemistLevel, abilities.int.mod);
    if (dc !== null) {
      out.push({
        key: "bomb",
        classTag: "alchemist",
        classLabel: classDisplayName(refData, "alchemist"),
        base: dc,
        save: "Reflex",
      });
    }
  }

  // Cruelty — antipaladin (APG); cruelties are selectable starting at 3rd
  // level (`antipaladin-cruelties.ts`'s doc comment: "At 3rd level, and every
  // three levels thereafter..."), so gate on 3 rather than 1 — a 1st/2nd
  // level antipaladin has no cruelty to apply a DC to yet.
  const antipaladinLevel = classLevel(doc, "antipaladin");
  if (antipaladinLevel >= 3) {
    out.push({
      key: "cruelty",
      classTag: "antipaladin",
      classLabel: classDisplayName(refData, "antipaladin"),
      base: antipaladinCrueltyDC(antipaladinLevel, abilities.cha.mod),
      save: "Fortitude",
    });
  }

  // Mesmerist Trick — mesmerist (Occult Adventures); the base "Mesmerist
  // Tricks" class feature's own description states the DC directly (not
  // per-trick): "The DC for any mesmerist trick or masterful trick that
  // requires a saving throw or skill check is 10 + 1/2 the mesmerist's level
  // + the mesmerist's Charisma modifier" (vendored `class-features.json`).
  const mesmeristLevel = classLevel(doc, "mesmerist");
  if (mesmeristLevel > 0) {
    const dc = stdDC(mesmeristLevel, abilities.cha.mod);
    if (dc !== null) {
      out.push({
        key: "mesmeristTrick",
        classTag: "mesmerist",
        classLabel: classDisplayName(refData, "mesmerist"),
        base: dc,
      });
    }
  }

  // Stunning Fist — CRB feat text: "DC 10 + 1/2 your CHARACTER level + your
  // Wis modifier" (not class level — the "Special" paragraph only widens a
  // monk's uses/day, it does not change the DC formula). Gated on chained OR
  // unchained monk levels (both grant it as a bonus feat at 1st,
  // `CLASS_ALIASES`'s `monk`/`monkUnchained` pairing in `feature-save-dc.ts`
  // is the same alias) OR the character having taken the feat directly.
  // Deliberately NOT the vendored class feature's own `save.dcFormula`
  // (`10 + floor(@class.unlevel / 2) + @abilities.wis.mod`, evaluated with
  // `@class.unlevel` = monk level only) — that would under-DC a multiclass
  // monk against the printed feat text, which is character-level based.
  const monkLevel = Math.max(classLevel(doc, "monk"), classLevel(doc, "monkUnchained"));
  if (monkLevel > 0 || hasFeatSlug(doc, refData, "stunning-fist")) {
    const dc = stdDC(totalLevel(doc), abilities.wis.mod);
    if (dc !== null) {
      out.push({
        key: "stunningFist",
        classTag: "monk",
        classLabel: "Monk",
        base: dc,
        save: "Fortitude",
      });
    }
  }

  // Quivering Palm — CRB monk capstone-adjacent ability, chained monk 15th
  // level only ("DC 10 + 1/2 the monk's level + the monk's Wis modifier" —
  // vendored `class-features.json` "Quivering Palm" description). Unchained
  // monk (Pathfinder Unchained) does NOT grant this automatically at any
  // level — it's an optional 16th-level KI POWER a player may or may not
  // have chosen (`monk-ki-powers.ts`'s `quiveringPalm` entry), which this
  // module has no visibility into (no `build.monkKiPowers`-style choice
  // field is threaded here), so an unchained monk is left out entirely
  // rather than guessed at.
  const chainedMonkLevel = classLevel(doc, "monk");
  if (chainedMonkLevel >= 15) {
    const dc = stdDC(chainedMonkLevel, abilities.wis.mod);
    if (dc !== null) {
      out.push({
        key: "quiveringPalm",
        classTag: "monk",
        classLabel: classDisplayName(refData, "monk"),
        base: dc,
        save: "Fortitude",
      });
    }
  }

  return out;
}

/** `computeAbilityDCs`'s result: the sheet-facing list plus the (narrow) map `feature-save-dc.ts` can safely substitute against. */
export interface ComputedAbilityDCs {
  /** `DerivedSheet.abilityDCs` — omit the field entirely (not `[]`) when this is empty. */
  dcs: DerivedAbilityDC[];
  /**
   * Final DCs keyed by family, for `feature-save-dc.ts`'s
   * `SaveDCContext.familyDCs`. Populated ONLY for the families where exactly
   * one `SAVE_DC_PHRASES` entry maps onto this family unambiguously:
   *
   * - `hex` -> the WITCH instance specifically, never a shaman's — the
   *   witch-hex phrase text ("10 + 1/2 witch level + Int mod") is the only
   *   phrase `family: "hex"` can ever match (a shaman's own hex notes use a
   *   different, unmapped phrase), so keying this off any hex instance other
   *   than the witch's would substitute the wrong number for a
   *   witch/shaman multiclass.
   * - `cruelty` -> antipaladin, its only possible source (no ambiguity, but
   *   named explicitly here rather than derived generically for the same
   *   reason).
   *
   * The other five families have no `SAVE_DC_PHRASES` entry today (channel/
   * bomb/mesmeristTrick/stunningFist/quiveringPalm notes, where they exist,
   * don't use the `resolveSaveDCText` formula-phrase mechanism), so nothing
   * is populated for them — `feature-save-dc.ts` simply never looks them up.
   */
  familyDCs: Readonly<Record<string, number>>;
}

/**
 * Compute every enemy-facing ability DC the character has, folding in any
 * `abilityDC.<family>`-targeted modifier (typed-stacked via `resolveStack`,
 * same as every other DerivedSheet stat) shared across every instance of
 * that family — there are no per-instance-scoped modifiers in v1, so a
 * multiclass witch/shaman's `abilityDC.hex` modifier raises BOTH hex DCs.
 *
 * Call with the FINAL pass's `abilities`/`collected`/`rollData` (post
 * ability-substitution, post buff/condition-agnostic static collect) — same
 * inputs `compute.ts` already has in hand by the time saves/cmb/cmd are
 * computed, so DCs reflect belt-of-intellect-style ability changes exactly
 * like the rest of the sheet.
 */
export function computeAbilityDCs(
  doc: CharacterDoc,
  refData: RefData,
  abilities: Record<AbilityId, AbilityView>,
  collected: CollectedModifier[],
  rollData: RollData,
): ComputedAbilityDCs {
  const raw = rawInstances(doc, refData, abilities, rollData);

  const byFamily = new Map<string, RawInstance[]>();
  for (const inst of raw) {
    const arr = byFamily.get(inst.key);
    if (arr) arr.push(inst);
    else byFamily.set(inst.key, [inst]);
  }

  const dcs: DerivedAbilityDC[] = [];
  const finalByInstance = new Map<string, number>();
  for (const key of FAMILY_ORDER) {
    const group = byFamily.get(key);
    if (!group || group.length === 0) continue;
    const stack = resolveStack(forTarget(collected, abilityDCTarget(key)));
    const familyLabel = `${ABILITY_DC_FAMILIES[key]!.label} DC`;
    for (const inst of group) {
      const finalDC = inst.base + stack.total;
      finalByInstance.set(`${inst.classTag}:${key}`, finalDC);
      dcs.push({
        key,
        label: group.length > 1 ? `${familyLabel} (${inst.classLabel})` : familyLabel,
        dc: finalDC,
        ...(inst.save ? { save: inst.save } : {}),
      });
    }
  }

  const familyDCs: Record<string, number> = {};
  const witchHex = finalByInstance.get("witch:hex");
  if (witchHex !== undefined) familyDCs.hex = witchHex;
  const cruelty = finalByInstance.get("antipaladin:cruelty");
  if (cruelty !== undefined) familyDCs.cruelty = cruelty;

  return { dcs, familyDCs };
}

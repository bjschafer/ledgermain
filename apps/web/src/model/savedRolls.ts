/**
 * Saved rolls (issue #2): a static, no-dice-roller lookup surface. A `SavedRoll`
 * is a bookmark — `{ label, source }` — into a number the engine already
 * computes, optionally nudged by a flat `attackModifier`/`damageModifier` for
 * situational feats the engine doesn't model as a toggle (Rapid Shot, Deadly
 * Aim, ...) or by attaching feats from the `SITUATIONAL_FEAT_EFFECTS` registry
 * (see feat-attachments below). Nothing is snapshotted; `resolveSavedRoll`
 * re-reads the current `DerivedSheet` every time, so a saved roll stays
 * correct as buffs/feats/gear change (same "recompute, don't memoize" posture
 * as the rest of the tracker). `source.kind === "custom"` has no engine
 * source at all — a fully freeform bookmark for the cases the other kinds
 * don't cover.
 *
 * Feat attachments: a `SavedRoll` can carry `feats: SavedRollFeatRef[]` —
 * feats folded into the roll's numbers at resolve time. Each ref is keyed by
 * `featNameSlug` (stable across data bumps) with a snapshotted display name,
 * so a since-removed/un-modeled feat still renders as a reminder chip. Only
 * feats that are BOTH currently owned (per the `ownedFeatSlugs` passed to
 * `resolveSavedRoll`) AND present in `SITUATIONAL_FEAT_EFFECTS` contribute
 * numbers; everything else is chip-only. Numeric folding only ever happens
 * for attack-like sources (melee/ranged/weapon/custom) — saves/skills/
 * initiative/CMB/CMD show attached feats as chips but never apply their
 * numbers, since "situational" feats here are specifically attack/damage
 * tweaks.
 */

import type {
  CharacterDoc,
  DerivedSheet,
  ModifierComponent,
  RefData,
  ResolvedWeaponAttack,
  SavedRoll,
  SavedRollFeatRef,
  SavedRollRangerRef,
  SavedRollSource,
} from "@pf1/schema";
import { SITUATIONAL_FEAT_EFFECTS, featNameSlug, type SituationalFeatEntry } from "@pf1/engine";

import { localId } from "./ids.js";
import { SAVE_NAMES, signed, signedSequence } from "./names.js";

/** One pickable thing a saved roll can point at, for the "add" picker. */
export interface SavedRollOption {
  source: SavedRollSource;
  /** Default label, used to seed the roll's editable `label` at add-time. */
  label: string;
}

/**
 * Every source currently pickable from the sheet: a fully custom bookmark
 * first (the most common starting point for a situational full-attack
 * combo), then base melee/ranged, each per-weapon attack line, CMB/CMD,
 * initiative, and the three saves. Skills are deliberately not offered here
 * (niche for saved rolls) but `resolveSource` still handles `kind: "skill"`
 * for rolls saved before this change. Options with no live
 * counterpart (e.g. a since-removed weapon) simply don't appear here —
 * they're still resolvable-but-missing on an already-saved roll via
 * {@link resolveSavedRoll}.
 */
export function availableSavedRollSources(sheet: DerivedSheet): SavedRollOption[] {
  const out: SavedRollOption[] = [
    { source: { kind: "custom" }, label: "Custom" },
    { source: { kind: "melee" }, label: "Melee Attack" },
    { source: { kind: "ranged" }, label: "Ranged Attack" },
  ];
  for (const atk of sheet.attacks) {
    out.push({ source: { kind: "weapon", weaponName: atk.name }, label: `${atk.name} (attack)` });
  }
  out.push({ source: { kind: "cmb" }, label: "CMB" });
  out.push({ source: { kind: "cmd" }, label: "CMD" });
  out.push({ source: { kind: "initiative" }, label: "Initiative" });
  for (const save of ["fort", "ref", "will"] as const) {
    out.push({ source: { kind: "save", save }, label: `${SAVE_NAMES[save]} Save` });
  }
  return out;
}

/** One ranger situational bonus attached to a saved roll, resolved for chip display. */
export interface SavedRollRangerChip {
  kind: "favored-enemy" | "favored-terrain";
  type: string;
  name: string;
  /** Bonus resolved LIVE from `sheet.ranger`; 0 when the type is no longer a favored pick. */
  bonus: number;
  /** True when the type is still among the character's favored enemies/terrains (its number is applied). */
  applied: boolean;
}

/** A resolved damage line, shown alongside a saved roll's attack value. */
export interface ResolvedSavedRollDamage {
  /** e.g. "1d8+6" (dice + signed bonus), or a freeform note for a custom roll. */
  display: string;
  components: ModifierComponent[];
  crit?: string;
}

/** One feat attached to a saved roll, resolved for display as a chip. */
export interface SavedRollFeatChip {
  slug: string;
  name: string;
  option?: string;
  /** True when this feat's registry effect is currently contributing to the resolved numbers. */
  applied: boolean;
  /** True when the feat has a `SITUATIONAL_FEAT_EFFECTS` entry (vs. a reminder-only chip). */
  modeled: boolean;
  /** True when the character currently owns this feat (per `ownedFeatSlugs`). */
  owned: boolean;
}

/** A saved roll resolved against the current sheet, ready to display. */
export interface ResolvedSavedRoll {
  id: string;
  label: string;
  /** e.g. "+11/+6" for an iterative attack, "+8" for a flat stat. */
  display: string;
  components: ModifierComponent[];
  /** True when the source no longer resolves (e.g. the referenced weapon was removed). */
  missing: boolean;
  damage?: ResolvedSavedRollDamage;
  /** At-table reminders surfaced by applied feat effects (e.g. "within 30 ft"). */
  notes: string[];
  /** Attached feats, resolved for chip display. */
  featChips: SavedRollFeatChip[];
  /** Attached ranger favored-enemy/terrain bonuses, resolved for chip display. */
  rangerChips: SavedRollRangerChip[];
}

/** Source kinds attack-like enough for feat effects to apply their numbers. */
const ATTACK_LIKE_KINDS = new Set<SavedRollSource["kind"]>(["melee", "ranged", "weapon", "custom"]);

/** Append a synthetic "Manual adjustment" component when `modifier` is nonzero. */
function withManualAdjustment(base: ModifierComponent[], modifier: number): ModifierComponent[] {
  if (!modifier) return base;
  return [
    ...base,
    { source: "Manual adjustment", type: "untyped", value: modifier, applied: true },
  ];
}

/** Feat-effect contributions folded into an attack-like source's sequence/damage. */
interface FeatFold {
  attackDelta: number;
  extraAttacks: number;
  attackComponents: ModifierComponent[];
  damageDelta: number;
  damageComponents: ModifierComponent[];
}

const NO_FEAT_FOLD: FeatFold = {
  attackDelta: 0,
  extraAttacks: 0,
  attackComponents: [],
  damageDelta: 0,
  damageComponents: [],
};

/**
 * A signed (or iterative) total with `modifier` and any folded feat attack
 * deltas applied to every entry, plus `extraAttacks` copies of the (adjusted)
 * highest entry prepended (e.g. base +9/+4 with Rapid Shot's -2/+1 extra ->
 * +7/+7/+2). Provenance keeps the manual-adjustment synthetic component and
 * one component per contributing feat separate.
 */
function signedResult(
  total: number,
  iteratives: number[] | undefined,
  modifier: number,
  baseComponents: ModifierComponent[],
  featFold: FeatFold = NO_FEAT_FOLD,
): { display: string; components: ModifierComponent[] } {
  const totalDelta = modifier + featFold.attackDelta;
  const base = iteratives ?? [total];
  const adjusted = base.map((n) => n + totalDelta);
  const seq =
    featFold.extraAttacks > 0
      ? [...(Array(featFold.extraAttacks).fill(adjusted[0]) as number[]), ...adjusted]
      : adjusted;
  const adjustedComponents = withManualAdjustment(baseComponents, modifier);
  return {
    display: signedSequence(seq[0]!, seq.length > 1 ? seq : undefined),
    components:
      featFold.attackComponents.length > 0
        ? [...adjustedComponents, ...featFold.attackComponents]
        : adjustedComponents,
  };
}

function weaponDamage(
  atk: ResolvedWeaponAttack,
  damageModifier: number,
  featDamageDelta = 0,
  featDamageComponents: ModifierComponent[] = [],
): ResolvedSavedRollDamage {
  const bonusTotal = atk.damageBonus.total + damageModifier + featDamageDelta;
  const bonusStr = bonusTotal !== 0 ? signed(bonusTotal) : null;
  const display = [atk.damageDice, bonusStr].filter(Boolean).join("") || signed(bonusTotal);
  const adjustedComponents = withManualAdjustment(atk.damageBonus.components, damageModifier);
  return {
    display,
    components:
      featDamageComponents.length > 0
        ? [...adjustedComponents, ...featDamageComponents]
        : adjustedComponents,
    crit: atk.crit,
  };
}

/**
 * Fold a saved roll's attached feats AND ranger situational bonuses into
 * attack/damage deltas + provenance + notes + chip descriptors.
 *
 * Feat numeric contributions only ever apply when `isAttackLike` (save/skill/
 * initiative/CMB/CMD sources still get feat chips, just no folded numbers),
 * because the situational-feat registry is specifically attack/damage tweaks.
 *
 * Ranger favored-enemy/terrain bonuses, by contrast, apply their number to
 * WHATEVER the player attached them to (a favored-enemy roll can be an attack,
 * a Perception check, …) — same "player judges applicability" posture as the
 * feats, but not gated to attack-like sources. Favored Enemy contributes both
 * attack and damage (vs. that creature type); Favored Terrain contributes only
 * the roll total. Bonuses are read LIVE from `sheet.ranger`, so a since-removed
 * favored pick resolves to a reminder chip with `applied: false`.
 */
function foldAttachments(
  featRefs: SavedRollFeatRef[],
  rangerRefs: SavedRollRangerRef[],
  isAttackLike: boolean,
  sheet: DerivedSheet,
  ownedFeatSlugs: ReadonlySet<string> | undefined,
): {
  fold: FeatFold;
  notes: string[];
  featChips: SavedRollFeatChip[];
  rangerChips: SavedRollRangerChip[];
} {
  const fold: FeatFold = {
    attackDelta: 0,
    extraAttacks: 0,
    attackComponents: [],
    damageDelta: 0,
    damageComponents: [],
  };
  const notes: string[] = [];
  const featChips: SavedRollFeatChip[] = [];
  const rangerChips: SavedRollRangerChip[] = [];

  for (const ref of featRefs) {
    const owned = ownedFeatSlugs === undefined || ownedFeatSlugs.has(ref.slug);
    const entry = SITUATIONAL_FEAT_EFFECTS[ref.slug];
    const modeled = entry !== undefined;
    const applied = isAttackLike && owned && modeled;
    if (applied) {
      const effect = entry.effect({ bab: sheet.bab }, ref.option);
      if (effect.attack) {
        fold.attackDelta += effect.attack;
        fold.attackComponents.push({
          source: ref.name,
          type: "untyped",
          value: effect.attack,
          applied: true,
        });
      }
      if (effect.damage) {
        fold.damageDelta += effect.damage;
        fold.damageComponents.push({
          source: ref.name,
          type: "untyped",
          value: effect.damage,
          applied: true,
        });
      }
      if (effect.extraAttacks) fold.extraAttacks += effect.extraAttacks;
      // Display-only (issue #62): acDelta never folds into the roll's own
      // number (AC isn't a saved-roll source at all) — just a formatted
      // reminder alongside any note text, generic enough to cover future
      // attack-for-AC feats (Combat Expertise today) without bespoke prose
      // baked into each entry's `note`.
      if (effect.acDelta) notes.push(`+${effect.acDelta} dodge AC`);
      if (effect.note) notes.push(effect.note);
    }
    featChips.push({ slug: ref.slug, name: ref.name, option: ref.option, applied, modeled, owned });
  }

  for (const ref of rangerRefs) {
    const list =
      ref.kind === "favored-enemy" ? sheet.ranger?.favoredEnemies : sheet.ranger?.favoredTerrains;
    const bonus = list?.find((e) => e.type === ref.type)?.bonus ?? 0;
    const applied = bonus > 0;
    if (applied) {
      fold.attackDelta += bonus;
      fold.attackComponents.push({
        source: ref.name,
        type: "untyped",
        value: bonus,
        applied: true,
      });
      // Favored Enemy also boosts damage vs. that creature type; Favored Terrain does not.
      if (ref.kind === "favored-enemy") {
        fold.damageDelta += bonus;
        fold.damageComponents.push({
          source: ref.name,
          type: "untyped",
          value: bonus,
          applied: true,
        });
      }
    }
    rangerChips.push({ kind: ref.kind, type: ref.type, name: ref.name, bonus, applied });
  }

  return { fold, notes, featChips, rangerChips };
}

/**
 * Resolve one saved roll's current value + provenance from the live sheet.
 * `ownedFeatSlugs` — the character's currently-owned feats, by name slug — is
 * optional; when omitted, every attached feat is treated as owned (keeps
 * existing call sites/tests, which predate feat attachments, valid).
 */
export function resolveSavedRoll(
  roll: SavedRoll,
  sheet: DerivedSheet,
  ownedFeatSlugs?: ReadonlySet<string>,
): ResolvedSavedRoll {
  const attackModifier = roll.attackModifier ?? 0;
  const damageModifier = roll.damageModifier ?? 0;
  const isAttackLike = ATTACK_LIKE_KINDS.has(roll.source.kind);
  const { fold, notes, featChips, rangerChips } = foldAttachments(
    roll.feats ?? [],
    roll.rangerBonuses ?? [],
    isAttackLike,
    sheet,
    ownedFeatSlugs,
  );

  const resolved = resolveSource(roll.source, sheet, attackModifier, damageModifier, fold);
  if (!resolved) {
    return {
      id: roll.id,
      label: roll.label,
      display: "—",
      components: [],
      missing: true,
      notes,
      featChips,
      rangerChips,
    };
  }
  const damage =
    resolved.damage ??
    (roll.source.kind === "custom" && roll.customDamage
      ? { display: roll.customDamage, components: [] }
      : undefined);
  return {
    id: roll.id,
    label: roll.label,
    display: resolved.display,
    components: resolved.components,
    missing: false,
    damage,
    notes,
    featChips,
    rangerChips,
  };
}

function resolveSource(
  source: SavedRollSource,
  sheet: DerivedSheet,
  attackModifier: number,
  damageModifier: number,
  featFold: FeatFold,
): { display: string; components: ModifierComponent[]; damage?: ResolvedSavedRollDamage } | null {
  switch (source.kind) {
    case "melee":
      return signedResult(
        sheet.attack.melee.total,
        sheet.attack.melee.iteratives,
        attackModifier,
        sheet.attack.melee.components,
        featFold,
      );
    case "ranged":
      return signedResult(
        sheet.attack.ranged.total,
        sheet.attack.ranged.iteratives,
        attackModifier,
        sheet.attack.ranged.components,
        featFold,
      );
    case "weapon": {
      const atk = sheet.attacks.find((a) => a.name === source.weaponName);
      if (!atk) return null;
      return {
        ...signedResult(
          atk.attack.total,
          atk.attack.iteratives,
          attackModifier,
          atk.attack.components,
          featFold,
        ),
        damage: weaponDamage(atk, damageModifier, featFold.damageDelta, featFold.damageComponents),
      };
    }
    case "cmb":
      return signedResult(sheet.cmb, undefined, attackModifier, [], featFold);
    case "cmd":
      return {
        display: String(sheet.cmd + attackModifier + featFold.attackDelta),
        components: [...withManualAdjustment([], attackModifier), ...featFold.attackComponents],
      };
    case "initiative":
      return signedResult(
        sheet.initiative.total,
        undefined,
        attackModifier,
        sheet.initiative.components,
        featFold,
      );
    case "save":
      return signedResult(
        sheet.saves[source.save].total,
        undefined,
        attackModifier,
        sheet.saves[source.save].components,
        featFold,
      );
    case "skill": {
      const s = sheet.skills[source.skillId];
      if (!s) return null;
      return signedResult(s.total, undefined, attackModifier, s.components, featFold);
    }
    case "custom":
      return signedResult(0, undefined, attackModifier, [], featFold);
  }
}

/** Add a saved roll pointing at `source`, displayed as `label`. */
export function addSavedRoll(
  doc: CharacterDoc,
  source: SavedRollSource,
  label: string,
): CharacterDoc {
  const roll: SavedRoll = { id: localId("roll-"), label, source };
  return {
    ...doc,
    build: { ...doc.build, savedRolls: [...(doc.build.savedRolls ?? []), roll] },
  };
}

export function removeSavedRoll(doc: CharacterDoc, id: string): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      savedRolls: (doc.build.savedRolls ?? []).filter((r) => r.id !== id),
    },
  };
}

/** Patch a saved roll's editable fields (label, manual adjustments, custom damage note). */
export function updateSavedRoll(
  doc: CharacterDoc,
  id: string,
  patch: Partial<Pick<SavedRoll, "label" | "attackModifier" | "damageModifier" | "customDamage">>,
): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      savedRolls: (doc.build.savedRolls ?? []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
    },
  };
}

function mapSavedRoll(
  doc: CharacterDoc,
  rollId: string,
  fn: (r: SavedRoll) => SavedRoll,
): CharacterDoc {
  return {
    ...doc,
    build: {
      ...doc.build,
      savedRolls: (doc.build.savedRolls ?? []).map((r) => (r.id === rollId ? fn(r) : r)),
    },
  };
}

/** Attach a feat to a saved roll. Replaces any existing ref with the same slug. */
export function addSavedRollFeat(
  doc: CharacterDoc,
  rollId: string,
  ref: SavedRollFeatRef,
): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => ({
    ...r,
    feats: [...(r.feats ?? []).filter((f) => f.slug !== ref.slug), ref],
  }));
}

/** Detach a feat (by slug) from a saved roll. */
export function removeSavedRollFeat(doc: CharacterDoc, rollId: string, slug: string): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => ({
    ...r,
    feats: (r.feats ?? []).filter((f) => f.slug !== slug),
  }));
}

/** Set (or clear, passing `undefined`) the selected variant option for an attached feat. */
export function setSavedRollFeatOption(
  doc: CharacterDoc,
  rollId: string,
  slug: string,
  option: string | undefined,
): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => ({
    ...r,
    feats: (r.feats ?? []).map((f) => (f.slug === slug ? { ...f, option } : f)),
  }));
}

/**
 * Attach a ranger favored-enemy/terrain bonus to a saved roll. Replaces any
 * existing ref of the same kind+type (idempotent re-attach). The bonus itself
 * is resolved live at display time, so only the choice is stored here.
 */
export function addSavedRollRanger(
  doc: CharacterDoc,
  rollId: string,
  ref: SavedRollRangerRef,
): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => ({
    ...r,
    rangerBonuses: [
      ...(r.rangerBonuses ?? []).filter((b) => !(b.kind === ref.kind && b.type === ref.type)),
      ref,
    ],
  }));
}

/** Detach a ranger bonus (by kind+type) from a saved roll. */
export function removeSavedRollRanger(
  doc: CharacterDoc,
  rollId: string,
  kind: SavedRollRangerRef["kind"],
  type: string,
): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => ({
    ...r,
    rangerBonuses: (r.rangerBonuses ?? []).filter((b) => !(b.kind === kind && b.type === type)),
  }));
}

/** The character's currently-owned feats, by `featNameSlug`. For `resolveSavedRoll`'s `ownedFeatSlugs`. */
export function ownedFeatSlugs(doc: CharacterDoc, refData: RefData): Set<string> {
  return new Set(
    doc.build.feats.map((featId) => featNameSlug(refData.feats[featId]?.name ?? featId)),
  );
}

/** One feat pickable as a saved-roll attachment (the "+ feat" picker). */
export interface AttachableFeat {
  slug: string;
  name: string;
  /** True when the feat has a `SITUATIONAL_FEAT_EFFECTS` entry. */
  modeled: boolean;
  options?: { id: string; label: string }[];
  appliesTo?: SituationalFeatEntry["appliesTo"];
}

/**
 * Which registry `appliesTo` values count as "compatible" with a saved-roll
 * source's kind, for ordering the picker (a filter for ranking, not
 * enforcement — incompatible feats still show up, just lower in the list).
 * `null` means "all" — no filtering (custom rolls, or a weapon source whose
 * melee/ranged category can't be determined).
 */
function compatibleAppliesTo(
  doc: CharacterDoc,
  source: SavedRollSource,
): ReadonlySet<SituationalFeatEntry["appliesTo"]> | null {
  switch (source.kind) {
    case "melee":
      return new Set(["melee", "any"]);
    case "ranged":
      return new Set(["ranged", "any"]);
    case "weapon": {
      // Weapon melee/ranged-ness lives on the build-time WeaponInstance
      // (doc.build.weapons), not on the derived sheet's ResolvedWeaponAttack
      // — attachableFeats only receives doc/refData, so it reads the build
      // source of truth directly rather than requiring a `sheet` param just
      // for this ordering hint.
      const weapon = doc.build.weapons?.find((w) => w.name === source.weaponName);
      const category = weapon?.category ?? "melee";
      return new Set([category, "any"]);
    }
    default:
      return null;
  }
}

/**
 * Feats the character owns, pickable as saved-roll attachments: modeled feats
 * compatible with `source`'s kind first (alphabetical), then every other
 * owned feat alphabetically (unmodeled feats, or modeled-but-incompatible
 * ones — e.g. a ranged feat on a melee roll — still show up as reminder
 * chips, just not privileged in the ordering). Does not exclude feats already
 * attached to a given roll — that filtering is the UI's job.
 */
export function attachableFeats(
  doc: CharacterDoc,
  refData: RefData,
  source: SavedRollSource,
): AttachableFeat[] {
  const compatible = compatibleAppliesTo(doc, source);
  const all: AttachableFeat[] = doc.build.feats.map((featId) => {
    const name = refData.feats[featId]?.name ?? featId;
    const slug = featNameSlug(name);
    const entry = SITUATIONAL_FEAT_EFFECTS[slug];
    return {
      slug,
      name,
      modeled: entry !== undefined,
      options: entry?.options,
      appliesTo: entry?.appliesTo,
    };
  });

  const isPrioritized = (f: AttachableFeat): boolean =>
    f.modeled && (compatible === null || compatible.has(f.appliesTo!));
  const prioritized = all.filter(isPrioritized).sort((a, b) => a.name.localeCompare(b.name));
  const rest = all.filter((f) => !isPrioritized(f)).sort((a, b) => a.name.localeCompare(b.name));
  return [...prioritized, ...rest];
}

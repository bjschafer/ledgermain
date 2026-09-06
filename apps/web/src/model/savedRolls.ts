/**
 * Saved rolls: a static, no-dice-roller lookup surface. A `SavedRoll` is a
 * bookmark — `{ label, source }` — into a number the engine already computes,
 * optionally nudged by a flat `attackModifier`/`damageModifier` for
 * situational feats the engine doesn't model as a toggle (Rapid Shot, Deadly
 * Aim,...) or by attaching feats from the `SITUATIONAL_FEAT_EFFECTS` registry
 * (see feat-attachments below). Nothing is snapshotted; `resolveSavedRoll`
 * re-reads the current `DerivedSheet` every time, so a saved roll stays
 * correct as buffs/feats/gear change (same "recompute, don't memoize" posture
 * as the rest of the tracker). `source.kind === "custom"` has no engine source
 * at all — a fully freeform bookmark for the cases the other kinds don't
 * cover.
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
 *
 * Two-weapon fighting is the one combat mode that is NOT a feat attachment —
 * it needs no feats at all, so it rides a `twf` flag on the roll and applies
 * every owned chain feat automatically. See `model/twf.ts`. A monk's flurry of
 * blows rides a `flurry` flag the same way, and for the same reason: it's a
 * per-round choice, not a property of the character. The two are mutually
 * exclusive — the chained monk's text borrows two-weapon fighting's shape, but
 * a flurry is not two-weapon fighting.
 */

import type {
  CharacterDoc,
  DerivedSheet,
  FlurryMode,
  ModifierComponent,
  RefData,
  ResolvedWeaponAttack,
  SavedRoll,
  SavedRollFeatRef,
  SavedRollRangerRef,
  SavedRollSource,
  SavedRollTwf,
} from "@pf1/schema";
import {
  FEAT_CLASSIFICATION,
  FEAT_CLASSIFICATION_COMMUNITY,
  SITUATIONAL_FEAT_EFFECTS,
  TWF_CHAIN_SLUGS,
  featNameSlug,
  flurrySequence,
  type GrantedTwfChain,
  type SituationalFeatEntry,
} from "@pf1/engine";

import { localId } from "./ids.js";
import { SAVE_NAMES, signed, signedSequence } from "./names.js";
import { d20Formula, damageFormula } from "./rollFormula.js";
import { offHandAbilityDelta, resolveTwf, twfConfig, type TwfFold } from "./twf.js";
import { isUnarmedStrikeSource } from "./unarmedStrike.js";

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
  /** The same damage as a VTT-pasteable formula, e.g. "1d8 + 6". */
  formula: string;
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
  /**
   * True for a chip the roll's two-weapon mode supplies on its own (the owned
   * feats of the TWF chain). Not detachable — the player turns the mode off,
   * not the feat.
   */
  auto?: boolean;
  /** At-table reminder for an `auto` chip (the chain feat's own note). */
  note?: string;
}

/** A saved roll resolved against the current sheet, ready to display. */
export interface ResolvedSavedRoll {
  id: string;
  label: string;
  /** e.g. "+11/+6" for an iterative attack, "+8" for a flat stat. */
  display: string;
  /**
   * The same roll as VTT-pasteable formulas, one line per attack. Absent for a
   * CMD bookmark (a static defense, never rolled) and for a roll whose source
   * no longer resolves.
   */
  formula?: string;
  /**
   * The off-hand attack sequence, when this roll is flagged as two-weapon
   * fighting (e.g. "+6/+1/−4"). Rendered as a separate line — the off-hand is
   * its own sequence, not part of the primary `display`. Absent otherwise.
   */
  offHand?: string;
  /** The off-hand sequence as pasteable formulas; present exactly when `offHand` is. */
  offHandFormula?: string;
  /** Provenance for the off-hand line; present exactly when `offHand` is. */
  offHandComponents?: ModifierComponent[];
  /** The off-hand weapon's damage, when one is chosen (½ ability damage, or full with Double Slice). */
  offHandDamage?: ResolvedSavedRollDamage;
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
  /**
   * The two-weapon chain a class feature (brawler's flurry) currently lends
   * the character, when the roll is attack-like enough for two-weapon mode to
   * apply at all — present whether or not THIS roll's two-weapon mode is
   * toggled on, so the UI can label the toggle "Brawler's flurry" up front
   * rather than only after it's switched on.
   */
  grantedTwf?: GrantedTwfChain;
  /**
   * The character's flurry of blows, when this roll's source is something a
   * flurry could be made with ({@link flurryForSource}) — present whether or
   * not THIS roll's flurry mode is on, so the UI can offer the toggle. The
   * roll's own on/off state is `SavedRoll.flurry`.
   */
  flurry?: FlurryMode;
}

/**
 * The character's flurry as it applies to `source`, or `undefined` when this
 * roll can't be a flurry.
 *
 * A weapon source qualifies only when that weapon does (the engine puts a
 * `flurry` line on the unarmed strikes and monk weapons a flurry may be made
 * with, and on nothing else). The generic melee and custom sources are offered
 * on the player's judgement, the same way every other saved-roll mode is; the
 * generic ranged one is not, since a flurry off the ranged attack bonus would
 * need a monk weapon the roll never names.
 */
export function flurryForSource(
  source: SavedRollSource,
  sheet: DerivedSheet,
): FlurryMode | undefined {
  if (!sheet.flurry) return undefined;
  switch (source.kind) {
    case "weapon":
      return sheet.attacks.find((a) => a.name === source.weaponName)?.flurry
        ? sheet.flurry
        : undefined;
    case "melee":
    case "custom":
      return sheet.flurry;
    default:
      return undefined;
  }
}

/** Source kinds attack-like enough for feat effects to apply their numbers. */
const ATTACK_LIKE_KINDS = new Set<SavedRollSource["kind"]>(["melee", "ranged", "weapon", "custom"]);

/** True when `source` is an attack the situational feats / two-weapon mode can act on. */
export function isAttackLikeSource(source: SavedRollSource): boolean {
  return ATTACK_LIKE_KINDS.has(source.kind);
}

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
  /** Extra delta applied to the FIRST attack only (Furious Focus negating Power Attack). */
  firstAttackDelta: number;
  firstAttackComponents: ModifierComponent[];
  damageDelta: number;
  damageComponents: ModifierComponent[];
  /**
   * The same damage contributions as they land on an OFF-HAND attack: Power
   * Attack and Piranha Strike halve their damage bonus off-hand, everything
   * else applies in full (PF1 CRB p. 131).
   */
  offHandDamageDelta: number;
  offHandDamageComponents: ModifierComponent[];
}

const NO_FEAT_FOLD: FeatFold = {
  attackDelta: 0,
  extraAttacks: 0,
  attackComponents: [],
  firstAttackDelta: 0,
  firstAttackComponents: [],
  damageDelta: 0,
  damageComponents: [],
  offHandDamageDelta: 0,
  offHandDamageComponents: [],
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
  twf?: TwfFold,
  flurry?: FlurryMode,
): {
  display: string;
  formula: string;
  offHand?: string;
  offHandFormula?: string;
  offHandComponents?: ModifierComponent[];
  offHandDamage?: ResolvedSavedRollDamage;
  components: ModifierComponent[];
} {
  const primaryPenalty = twf?.profile.primaryPenalty ?? 0;
  const totalDelta = modifier + featFold.attackDelta + primaryPenalty;
  // A flurry replaces the whole sequence rather than adding to it: extra
  // attacks, and (chained) a different base attack bonus and a flat -2 on
  // every swing. Everything else the roll folds in still rides on top.
  const base = flurry ? flurrySequence(flurry, total) : (iteratives ?? [total]);
  const adjusted = base.map((n) => n + totalDelta);
  const seq =
    featFold.extraAttacks > 0
      ? [...(Array(featFold.extraAttacks).fill(adjusted[0]) as number[]), ...adjusted]
      : adjusted;
  // Furious Focus negates Power Attack's penalty on the first attack only, so a
  // first-attack delta lands on the highest entry after any extra attacks are
  // prepended (Furious Focus is melee-only and extra-attack feats are ranged-only,
  // so the two never co-occur — seq[0] is unambiguously "the first attack").
  if (featFold.firstAttackDelta && seq.length > 0) seq[0] = seq[0]! + featFold.firstAttackDelta;
  const adjustedComponents = withManualAdjustment(baseComponents, modifier);
  const attackComponents = [...featFold.attackComponents, ...featFold.firstAttackComponents];
  const twoWeapon = twf
    ? offHandResult(base[0]!, baseComponents, modifier, featFold, twf)
    : undefined;
  const extraComponents = [
    ...attackComponents,
    ...(twf ? [twoWeaponComponent("main hand", primaryPenalty)] : []),
    ...(flurry ? flurryComponents(flurry) : []),
  ];
  return {
    display: signedSequence(seq[0]!, seq.length > 1 ? seq : undefined),
    formula: d20Formula(seq),
    ...twoWeapon,
    // Kept reference-equal to the source's own components when nothing was
    // folded in, so an untouched roll shares the sheet's array.
    components:
      extraComponents.length > 0 ? [...adjustedComponents, ...extraComponents] : adjustedComponents,
  };
}

/**
 * Provenance for what the flurry itself changed: the chained monk's
 * base-attack-bonus substitution and her flat penalty, each only when it moves
 * a number (the unchained monk's flurry moves neither, and adds attacks
 * instead, which the sequence itself shows).
 */
function flurryComponents(flurry: FlurryMode): ModifierComponent[] {
  const out: ModifierComponent[] = [];
  if (flurry.babDelta !== 0) {
    out.push({
      source: "Flurry of blows (monk level as BAB)",
      type: "untyped",
      value: flurry.babDelta,
      applied: true,
    });
  }
  if (flurry.penalty !== 0) {
    out.push({
      source: "Flurry of blows (every attack)",
      type: "untyped",
      value: flurry.penalty,
      applied: true,
    });
  }
  return out;
}

/** Provenance entry for the two-weapon penalty on one hand. */
function twoWeaponComponent(hand: string, penalty: number): ModifierComponent {
  return {
    source: `Two-weapon fighting (${hand})`,
    type: "untyped",
    value: penalty,
    applied: true,
  };
}

/**
 * The off-hand attack line: its own sequence, not part of the primary's
 * iterative progression. Each off-hand attack is made at the wielder's full
 * attack bonus (the CHOSEN off-hand weapon's, when one is set — it may have a
 * different enhancement bonus than the primary), less the off-hand two-weapon
 * penalty, with Improved/Greater adding attacks at −5/−10.
 *
 * Everything else the roll folds in (Power Attack, a favored enemy, a manual
 * adjustment) applies to both hands — only the two-weapon penalty differs,
 * which is why it's read off `base` here rather than off the primary's already
 * adjusted top attack.
 */
function offHandResult(
  primaryBase: number,
  primaryComponents: ModifierComponent[],
  modifier: number,
  featFold: FeatFold,
  twf: TwfFold,
): {
  offHand: string;
  offHandFormula: string;
  offHandComponents: ModifierComponent[];
  offHandDamage?: ResolvedSavedRollDamage;
} {
  const { profile, offHandAttack } = twf;
  const baseTotal = offHandAttack?.attack.total ?? primaryBase;
  const baseComponents = offHandAttack?.attack.components ?? primaryComponents;
  const top = baseTotal + modifier + featFold.attackDelta + profile.offHandPenalty;
  const seq = profile.offHandOffsets.map((off) => top + off);
  return {
    offHand: signedSequence(seq[0]!, seq.length > 1 ? seq : undefined),
    offHandFormula: d20Formula(seq),
    offHandComponents: [
      ...withManualAdjustment(baseComponents, modifier),
      ...featFold.attackComponents,
      twoWeaponComponent("off hand", profile.offHandPenalty),
    ],
    ...(offHandAttack ? { offHandDamage: offHandDamageLine(offHandAttack, featFold, twf) } : {}),
  };
}

/**
 * The off-hand weapon's damage, with its ability contribution restated for the
 * off hand — half (or full, with Double Slice) regardless of how the weapon
 * instance is configured, since the same weapon may be a primary elsewhere.
 */
function offHandDamageLine(
  atk: ResolvedWeaponAttack,
  featFold: FeatFold,
  twf: TwfFold,
): ResolvedSavedRollDamage {
  const abilityDelta = offHandAbilityDelta(atk, twf.profile.offHandDamageMultiplier);
  const bonusTotal = atk.damageBonus.total + abilityDelta + featFold.offHandDamageDelta;
  const bonusStr = bonusTotal !== 0 ? signed(bonusTotal) : null;
  const components = [...atk.damageBonus.components, ...featFold.offHandDamageComponents];
  if (abilityDelta !== 0) {
    components.push({
      source: `Off-hand (×${twf.profile.offHandDamageMultiplier} ability)`,
      type: "untyped",
      value: abilityDelta,
      applied: true,
    });
  }
  return {
    display: [atk.damageDice, bonusStr].filter(Boolean).join("") || signed(bonusTotal),
    formula: damageFormula(atk.damageDice, bonusTotal),
    components,
    crit: atk.crit,
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
    formula: damageFormula(atk.damageDice, bonusTotal),
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
    firstAttackDelta: 0,
    firstAttackComponents: [],
    damageDelta: 0,
    damageComponents: [],
    offHandDamageDelta: 0,
    offHandDamageComponents: [],
  };
  const notes: string[] = [];
  const featChips: SavedRollFeatChip[] = [];
  const rangerChips: SavedRollRangerChip[] = [];

  // Furious Focus is a modifier ON Power Attack: it ignores that feat's attack
  // penalty on the first attack of the turn. Track the applied Power Attack
  // penalty and whether Furious Focus is also applied, then fold the first-attack
  // negation once both are known (order-independent — either feat may be listed
  // first). Nothing happens when Power Attack isn't attached, so Furious Focus
  // alone never conjures a phantom bonus.
  let powerAttackPenalty = 0;
  let furiousFocusName: string | null = null;

  for (const ref of featRefs) {
    const owned = ownedFeatSlugs === undefined || ownedFeatSlugs.has(ref.slug);
    const entry = SITUATIONAL_FEAT_EFFECTS[ref.slug];
    const modeled = entry !== undefined;
    const applied = isAttackLike && owned && modeled;
    if (applied) {
      const effect = entry.effect({ bab: sheet.bab }, ref.option);
      if (ref.slug === "power-attack" && effect.attack) powerAttackPenalty = effect.attack;
      if (ref.slug === "furious-focus") furiousFocusName = ref.name;
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
        // Power Attack / Piranha Strike give only half their damage bonus on an
        // off-hand attack; every other damage feat applies in full.
        const offHand = effect.damageHalvedOffHand ? Math.floor(effect.damage / 2) : effect.damage;
        fold.offHandDamageDelta += offHand;
        fold.offHandDamageComponents.push({
          source: effect.damageHalvedOffHand ? `${ref.name} (off-hand ½)` : ref.name,
          type: "untyped",
          value: offHand,
          applied: true,
        });
      }
      if (effect.extraAttacks) fold.extraAttacks += effect.extraAttacks;
      // Display-only: acDelta never folds into the roll's own number (AC isn't
      // a saved-roll source at all) — just a formatted reminder alongside any
      // note text, generic enough to cover future attack-for-AC feats (Combat
      // Expertise today) without bespoke prose baked into each entry's `note`.
      if (effect.acDelta) notes.push(`+${effect.acDelta} dodge AC`);
      if (effect.note) notes.push(effect.note);
    }
    featChips.push({ slug: ref.slug, name: ref.name, option: ref.option, applied, modeled, owned });
  }

  // Furious Focus cancels the (negative) Power Attack penalty on the first
  // attack: +p on the top entry, leaving the rest of the sequence penalized.
  if (furiousFocusName !== null && powerAttackPenalty < 0) {
    fold.firstAttackDelta -= powerAttackPenalty;
    fold.firstAttackComponents.push({
      source: `${furiousFocusName} (first attack)`,
      type: "untyped",
      value: -powerAttackPenalty,
      applied: true,
    });
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
        const component: ModifierComponent = {
          source: ref.name,
          type: "untyped",
          value: bonus,
          applied: true,
        };
        fold.damageDelta += bonus;
        fold.damageComponents.push(component);
        // Not one of the halved-off-hand bonuses — a favored enemy is just as
        // vulnerable to the off-hand weapon.
        fold.offHandDamageDelta += bonus;
        fold.offHandDamageComponents.push(component);
      }
    }
    rangerChips.push({ kind: ref.kind, type: ref.type, name: ref.name, bonus, applied });
  }

  // Collapse identical reminders — the same at-table note twice reads as
  // noise. Insertion order is preserved.
  return { fold, notes: [...new Set(notes)], featChips, rangerChips };
}

/** Stable slug for Improved Unarmed Strike, the one feat `resolveSavedRoll`/`attachableFeats` special-case. */
const IMPROVED_UNARMED_STRIKE_SLUG = featNameSlug("Improved Unarmed Strike");

/** At-table reminder for the auto-applied Improved Unarmed Strike chip. */
const IMPROVED_UNARMED_STRIKE_NOTE =
  "unarmed strikes deal lethal damage and do not provoke attacks of opportunity";

/**
 * Resolve one saved roll's current value + provenance from the live sheet.
 * `ownedFeatSlugs` — the character's currently-owned feats, by name slug — is
 * optional; when omitted, every attached feat is treated as owned (keeps
 * existing call sites/tests, which predate feat attachments, valid).
 * `grantedTwf` is the two-weapon chain a class feature lends the character
 * (`flurryTwfChain`); omitted, they fight with only the feats they own.
 * `improvedUnarmedStrike` is true when this roll's source is the character's
 * synthesized Unarmed Strike weapon AND they effectively have Improved
 * Unarmed Strike (taken or granted by class) — surfaces a non-detachable
 * reminder chip the same way an owned two-weapon chain feat does, since
 * "unarmed strikes are lethal, no AoO" is a fact about the character, not a
 * per-round choice the player toggles.
 */
export function resolveSavedRoll(
  roll: SavedRoll,
  sheet: DerivedSheet,
  ownedFeatSlugs?: ReadonlySet<string>,
  grantedTwf?: GrantedTwfChain,
  improvedUnarmedStrike?: boolean,
): ResolvedSavedRoll {
  const attackModifier = roll.attackModifier ?? 0;
  const damageModifier = roll.damageModifier ?? 0;
  const isAttackLike = ATTACK_LIKE_KINDS.has(roll.source.kind);
  const { fold, notes, featChips, rangerChips } = foldAttachments(
    // The two-weapon chain is applied by the roll's two-weapon mode, and
    // Improved Unarmed Strike (below) by the unarmed-strike source, not as an
    // attachment — so a legacy roll's refs for either never fold twice;
    // they're re-surfaced as auto chips instead.
    (roll.feats ?? []).filter(
      (f) =>
        !TWF_CHAIN_SLUGS.has(f.slug) &&
        !(improvedUnarmedStrike && f.slug === IMPROVED_UNARMED_STRIKE_SLUG),
    ),
    roll.rangerBonuses ?? [],
    isAttackLike,
    sheet,
    ownedFeatSlugs,
  );

  // The two modes are mutually exclusive (see the module comment), and a
  // stored doc could hold both if a roll predates the flurry toggle: flurry
  // wins, since it's the more specific claim about how the round is spent.
  const flurryAvailable = isAttackLike ? flurryForSource(roll.source, sheet) : undefined;
  const flurry = roll.flurry ? flurryAvailable : undefined;
  const cfg = isAttackLike && !flurry ? twfConfig(roll) : undefined;
  const twf = cfg ? resolveTwf(roll, cfg, sheet, ownedFeatSlugs, grantedTwf) : undefined;
  if (flurry) notes.push(`${flurry.source}: ${flurry.restriction}`);
  if (twf) {
    for (const feat of twf.profile.chain) {
      if (!feat.owned) continue;
      const note = feat.grantedBy ? `${feat.note} (from ${feat.grantedBy})` : feat.note;
      featChips.push({
        slug: feat.slug,
        name: feat.name,
        applied: feat.numeric,
        modeled: true,
        owned: true,
        auto: true,
        note,
      });
      if (!feat.numeric) notes.push(note);
    }
    // A lent chain always comes with strings attached (which weapons qualify),
    // so the restriction is a reminder even when every chain feat is numeric.
    if (twf.granted && twf.profile.chain.some((f) => f.grantedBy)) {
      notes.push(`${twf.granted.source}: ${twf.granted.restriction}`);
    }
    if (twf.offHandWeaponMissing) notes.push(`off-hand weapon "${cfg!.offHandWeapon}" not found`);
  }

  if (improvedUnarmedStrike) {
    featChips.push({
      slug: IMPROVED_UNARMED_STRIKE_SLUG,
      name: "Improved Unarmed Strike",
      applied: true,
      modeled: true,
      owned: true,
      auto: true,
      note: IMPROVED_UNARMED_STRIKE_NOTE,
    });
    notes.push(IMPROVED_UNARMED_STRIKE_NOTE);
  }

  const resolved = resolveSource(
    roll.source,
    sheet,
    attackModifier,
    damageModifier,
    fold,
    twf,
    flurry,
  );
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
      grantedTwf,
      ...(flurryAvailable ? { flurry: flurryAvailable } : {}),
    };
  }
  const damage =
    resolved.damage ??
    (roll.source.kind === "custom" && roll.customDamage
      ? // A custom roll's damage is freeform text the player typed ("2d6+4, x3
        // crit") — copied verbatim rather than reformatted, since only they
        // know which part of it is a formula.
        { display: roll.customDamage, formula: roll.customDamage, components: [] }
      : undefined);
  return {
    id: roll.id,
    label: roll.label,
    display: resolved.display,
    formula: resolved.formula,
    offHand: resolved.offHand,
    offHandFormula: resolved.offHandFormula,
    offHandComponents: resolved.offHandComponents,
    offHandDamage: resolved.offHandDamage,
    components: resolved.components,
    missing: false,
    damage,
    notes,
    featChips,
    rangerChips,
    grantedTwf,
    ...(flurryAvailable ? { flurry: flurryAvailable } : {}),
  };
}

function resolveSource(
  source: SavedRollSource,
  sheet: DerivedSheet,
  attackModifier: number,
  damageModifier: number,
  featFold: FeatFold,
  twf: TwfFold | undefined,
  flurry: FlurryMode | undefined,
): {
  display: string;
  formula?: string;
  offHand?: string;
  offHandFormula?: string;
  offHandComponents?: ModifierComponent[];
  offHandDamage?: ResolvedSavedRollDamage;
  components: ModifierComponent[];
  damage?: ResolvedSavedRollDamage;
} | null {
  switch (source.kind) {
    case "melee":
      return signedResult(
        sheet.attack.melee.total,
        sheet.attack.melee.iteratives,
        attackModifier,
        sheet.attack.melee.components,
        featFold,
        twf,
        flurry,
      );
    case "ranged":
      return signedResult(
        sheet.attack.ranged.total,
        sheet.attack.ranged.iteratives,
        attackModifier,
        sheet.attack.ranged.components,
        featFold,
        twf,
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
          twf,
          flurry,
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
      return signedResult(0, undefined, attackModifier, [], featFold, twf, flurry);
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

/**
 * Turn a saved roll's two-weapon mode on (with a grip + optional off-hand
 * weapon) or off (`undefined`). Also drops any two-weapon chain feats a
 * older roll had attached: the mode applies them from the character's feat
 * list now, so leaving the refs behind would only be dead weight.
 */
export function setSavedRollTwf(
  doc: CharacterDoc,
  rollId: string,
  twf: SavedRollTwf | undefined,
): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => {
    const feats = (r.feats ?? []).filter((f) => !TWF_CHAIN_SLUGS.has(f.slug));
    const next: SavedRoll = { ...r, feats };
    if (twf) next.twf = twf;
    else delete next.twf;
    // A flurry is not two-weapon fighting: turning one mode on turns the
    // other off rather than stacking two full-attack routines.
    if (twf) delete next.flurry;
    return next;
  });
}

/**
 * Turn a saved roll's flurry-of-blows mode on or off. Nothing about the flurry
 * is stored — the sequence is rebuilt from `DerivedSheet.flurry` every time —
 * so a monk who levels sees her saved flurry grow on its own.
 */
export function setSavedRollFlurry(
  doc: CharacterDoc,
  rollId: string,
  flurry: boolean,
): CharacterDoc {
  return mapSavedRoll(doc, rollId, (r) => {
    const next: SavedRoll = { ...r };
    if (flurry) {
      next.flurry = true;
      delete next.twf;
    } else {
      delete next.flurry;
    }
    return next;
  });
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
 * `attachableFeats`'s two picker groups: feats whose registry effect will
 * actually fold numbers/notes into THIS roll ("Applies automatically"), and
 * everything else, attachable only as an at-table reminder chip ("Reminder
 * only"). Mirrors the `<optgroup>` split in `SavedRollsPanel`'s "+ feat"
 * select.
 */
export interface AttachableFeatGroups {
  auto: AttachableFeat[];
  reminder: AttachableFeat[];
}

/**
 * Classification buckets (`@pf1/engine`'s feat-classification audit) whose
 * effect `compute()` already folds into the sheet's own numbers — Iron Will's
 * +2 Will, Weapon Focus's +1 attack, Extra Rage's pool bump, Fencing Grace's
 * Dex-for-Str swap on a rapier's damage. Attaching one of these to a saved
 * roll would double-count it (or, for a substitution, restate a swap the
 * weapon's line already reflects), so `attachableFeats` excludes them
 * outright rather than merely deprioritizing them.
 */
const STATICALLY_APPLIED_BUCKETS: ReadonlySet<string> = new Set([
  "numeric",
  "choice-numeric",
  "substitution",
  "pool",
]);

/** True when `slug`'s classified bucket (if any) is already reflected in the sheet's numbers. */
function isStaticallyApplied(slug: string): boolean {
  const bucket = FEAT_CLASSIFICATION[slug]?.bucket ?? FEAT_CLASSIFICATION_COMMUNITY[slug];
  return bucket !== undefined && STATICALLY_APPLIED_BUCKETS.has(bucket);
}

/**
 * Which registry `appliesTo` values count as "compatible" with a saved-roll
 * source's kind — which picker group a modeled feat lands in. `null` means
 * "all" — no filtering (custom rolls, or a weapon source whose melee/ranged
 * category can't be determined).
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
 * Source kinds combat-focused enough that the "Reminder only" group is
 * narrowed to Combat-tagged feats: an attack or maneuver roll has no use for
 * Iron Will-style save feats or skill feats cluttering its picker. Saves,
 * skills, initiative and custom rolls keep the broader reminder list — a
 * custom bookmark in particular might be anything (an Aid Another, a trap
 * Perception check), so it isn't narrowed at all.
 */
const COMBAT_RESTRICTED_KINDS = new Set<SavedRollSource["kind"]>([
  "melee",
  "ranged",
  "weapon",
  "cmb",
]);

/**
 * Feats the character owns, pickable as saved-roll attachments, grouped into
 * "applies automatically" (modeled AND compatible with `source`'s kind, per
 * {@link compatibleAppliesTo}) and "reminder only" (everything else). Feats
 * whose effect is already statically folded into the sheet ({@link
 * isStaticallyApplied}) never appear in either group — attaching them would
 * only double-count a number the sheet already shows. On a combat-focused
 * source ({@link COMBAT_RESTRICTED_KINDS}) the reminder group is further
 * narrowed to Combat-tagged feats. Does not exclude feats already attached to
 * a given roll, or Improved Unarmed Strike on an unarmed-strike roll (both
 * apply automatically instead) — that filtering is the UI's/`resolveSavedRoll`'s
 * job respectively.
 */
export function attachableFeats(
  doc: CharacterDoc,
  refData: RefData,
  source: SavedRollSource,
): AttachableFeatGroups {
  const compatible = compatibleAppliesTo(doc, source);
  const unarmedStrikeRoll = isUnarmedStrikeSource(doc, source);

  const all = doc.build.feats
    .map((featId) => {
      const name = refData.feats[featId]?.name ?? featId;
      const slug = featNameSlug(name);
      const entry = SITUATIONAL_FEAT_EFFECTS[slug];
      return {
        slug,
        name,
        modeled: entry !== undefined,
        options: entry?.options,
        appliesTo: entry?.appliesTo,
        tags: refData.feats[featId]?.tags ?? [],
      };
    })
    // The two-weapon chain isn't attachable: it comes with the roll's
    // two-weapon toggle, which applies every owned chain feat at once.
    .filter((f) => !TWF_CHAIN_SLUGS.has(f.slug))
    .filter((f) => !isStaticallyApplied(f.slug))
    // Improved Unarmed Strike auto-applies to an unarmed-strike roll instead
    // (see resolveSavedRoll), so it's never offered here for one.
    .filter((f) => !(unarmedStrikeRoll && f.slug === IMPROVED_UNARMED_STRIKE_SLUG));

  const isAuto = (f: (typeof all)[number]): boolean =>
    f.modeled && (compatible === null || compatible.has(f.appliesTo!));
  const auto = all.filter(isAuto).sort((a, b) => a.name.localeCompare(b.name));
  const reminderPool = all.filter((f) => !isAuto(f));
  const reminder = (
    COMBAT_RESTRICTED_KINDS.has(source.kind)
      ? reminderPool.filter((f) => f.tags.includes("Combat"))
      : reminderPool
  ).sort((a, b) => a.name.localeCompare(b.name));

  const strip = ({
    slug,
    name,
    modeled,
    options,
    appliesTo,
  }: (typeof all)[number]): AttachableFeat => ({
    slug,
    name,
    modeled,
    options,
    appliesTo,
  });
  return { auto: auto.map(strip), reminder: reminder.map(strip) };
}

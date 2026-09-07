/**
 * Applying metamagic to the spell line: turns the `effect` declarations in
 * `metamagic.ts` into the numbers a caster reads mid-turn.
 *
 * `METAMAGIC_FEATS` is the rules table; this module is the arithmetic over it.
 * Callers aggregate every feat applied to one casting into a
 * {@link MetamagicSpellEffects}, then feed that to the display formatters —
 * {@link metamagicDamageText} here for damage, and the range/duration/area
 * multipliers to whatever formats those (apps/web's `model/spellStats.ts`).
 *
 * What "the spell's level" means here is the EFFECTIVE level: base level plus
 * Heighten, which is the one metamagic that genuinely raises it. Every rider
 * that scales ("dazed for rounds equal to the spell's level") reads off that
 * number, so a heightened dazing spell dazes for longer, and no other slot
 * increase changes a rider.
 *
 * Eligibility is checked where the vendored data can answer it: a feat gated
 * on a descriptor, on the spell dealing damage, or on it allowing a save
 * contributes nothing when the spell doesn't qualify. Gates the data can't
 * express (Widen's burst/emanation/spread shapes, Focused Spell needing more
 * than one target) are left to the player, with the feat's `note` as the
 * reminder.
 */

import type { AppliedMetamagic, Spell } from "@pf1/schema";

import {
  diceChainOf,
  evaluateNode,
  formatDiceChain,
  parseFormula,
  type FormulaNode,
  type RollData,
} from "./formula.js";
import { metamagicDef, type MetamagicDef, type MetamagicRider } from "./metamagic.js";

/**
 * The slot-level increase ONE applied metamagic entry contributes: the
 * player-chosen `levels` for a variable feat (Reach, Heighten), falling back
 * to the registry default, else the fixed registry increase. An unmodeled slug
 * contributes 0 — soft-degrade, never throw, matching the rest of the spell
 * pipeline.
 */
export function appliedMetamagicIncrease(applied: AppliedMetamagic): number {
  const def = metamagicDef(applied.slug);
  if (!def) return 0;
  if (def.variable) return Math.max(1, applied.levels ?? def.slotIncrease);
  return def.slotIncrease;
}

/** Every metamagic effect on one casting, summed into the numbers the spell line needs. */
export interface MetamagicSpellEffects {
  /** Product of every numeric multiplier; 1 when none apply. Empower Spell: 1.5. */
  numericMultiplier: number;
  /** Variable numeric effects are maximized instead of rolled. */
  maximize: boolean;
  /** Flat damage added to the spell's first damage part. Furious Spell: 2 × spell level. */
  flatDamage: number;
  /** Caster levels added to the spell's damage-dice cap. Intensified Spell: 5. */
  diceCapLevels: number;
  /** Product of every duration multiplier; 1 when none apply. */
  durationMultiplier: number;
  /** Product of every range multiplier; 1 when none apply. */
  rangeMultiplier: number;
  /** Range categories the spell's range climbs (touch → close → medium → long). */
  rangeSteps: number;
  /** Product of every area multiplier; 1 when none apply. */
  areaMultiplier: number;
  /** Resolved rider lines, in feat-name order. */
  riders: MetamagicRiderLine[];
}

/** The identity aggregate: what a spell with no metamagic on it gets. */
export const NO_METAMAGIC_EFFECTS: MetamagicSpellEffects = {
  numericMultiplier: 1,
  maximize: false,
  flatDamage: 0,
  diceCapLevels: 0,
  durationMultiplier: 1,
  rangeMultiplier: 1,
  rangeSteps: 0,
  areaMultiplier: 1,
  riders: [],
};

/** True when the aggregate changes nothing about how the spell reads. */
export function hasMetamagicEffects(fx: MetamagicSpellEffects): boolean {
  return (
    fx.numericMultiplier !== 1 ||
    fx.maximize ||
    fx.flatDamage !== 0 ||
    fx.diceCapLevels !== 0 ||
    fx.durationMultiplier !== 1 ||
    fx.rangeMultiplier !== 1 ||
    fx.rangeSteps !== 0 ||
    fx.areaMultiplier !== 1 ||
    fx.riders.length > 0
  );
}

/** The spell facts the eligibility gates read. Structural so callers can pass a `Spell`. */
export interface MetamagicSpellContext {
  descriptors?: readonly string[];
  actions?: readonly Spell["actions"][number][];
}

/**
 * Descriptor strings in the vendored data are mostly single words, but a
 * handful carry the printed prose of a variable line ("acid, cold,
 * electricity, or fire"). Splitting on non-letters means such a spell matches
 * every energy type it can be cast as, which is the right answer for a
 * descriptor gate.
 */
function descriptorWords(spell: MetamagicSpellContext): Set<string> {
  const out = new Set<string>();
  for (const d of spell.descriptors ?? []) {
    for (const word of d.toLowerCase().split(/[^a-z]+/)) {
      if (word) out.add(word);
    }
  }
  return out;
}

function dealsDamage(spell: MetamagicSpellContext): boolean {
  return (spell.actions ?? []).some((a) => (a.damage?.parts ?? []).some((p) => p.formula?.trim()));
}

function allowsSave(spell: MetamagicSpellContext): boolean {
  return (spell.actions ?? []).some((a) => Boolean(a.save?.type));
}

/** Whether a feat's gates are satisfied by the spell it's applied to. */
function effectApplies(def: MetamagicDef, spell: MetamagicSpellContext): boolean {
  const effect = def.effect;
  if (!effect) return false;
  if (effect.needsDamage && !dealsDamage(spell)) return false;
  if (effect.needsSave && !allowsSave(spell)) return false;
  if (effect.descriptors) {
    const words = descriptorWords(spell);
    if (!effect.descriptors.some((d) => words.has(d))) return false;
  }
  return true;
}

/**
 * One rider resolved against the spell's level, in two lengths. `short` is
 * what fits a chip in the stat strip ("Dazed 3 rounds"); `full` adds how the
 * target avoids it, for the detail row where there's room to read it.
 */
export interface MetamagicRiderLine {
  short: string;
  full: string;
}

/** Resolve a rider's numbers against `spellLevel`. */
export function riderText(rider: MetamagicRider, spellLevel: number): MetamagicRiderLine {
  let short = rider.label;
  const rounds = rider.rounds ?? (rider.roundsPerLevel ?? 0) * spellLevel;
  if (rounds > 0) short += ` ${rounds} round${rounds === 1 ? "" : "s"}`;
  if (rider.damagePerLevel) short += ` ${rider.damagePerLevel * spellLevel}`;
  return { short, full: rider.detail ? `${short} (${rider.detail})` : short };
}

/**
 * Aggregate every metamagic feat applied to one casting. `spellLevel` is the
 * spell's effective level (base + Heighten), which the level-scaled riders and
 * Furious Spell's flat damage read off. Feats with no modeled effect, or whose
 * gates the spell fails, drop out silently — their `note` is still shown
 * beside the feat's name, so nothing disappears from the player's view.
 */
export function metamagicSpellEffects(
  applied: readonly AppliedMetamagic[] | undefined,
  spell: MetamagicSpellContext,
  spellLevel: number,
): MetamagicSpellEffects {
  if (!applied || applied.length === 0) return NO_METAMAGIC_EFFECTS;
  const fx: MetamagicSpellEffects = { ...NO_METAMAGIC_EFFECTS, riders: [] };
  const riders: { name: string; line: MetamagicRiderLine }[] = [];
  for (const entry of applied) {
    const def = metamagicDef(entry.slug);
    if (!def || !effectApplies(def, spell)) continue;
    const effect = def.effect!;
    if (effect.numeric) fx.numericMultiplier *= effect.numeric;
    if (effect.maximize) fx.maximize = true;
    if (effect.damagePerLevel) fx.flatDamage += effect.damagePerLevel * spellLevel;
    if (effect.diceCapLevels) fx.diceCapLevels += effect.diceCapLevels;
    if (effect.duration) fx.durationMultiplier *= effect.duration;
    if (effect.range) fx.rangeMultiplier *= effect.range;
    // Reach Spell climbs one range category per slot level the player spent on it.
    if (effect.rangeSteps) fx.rangeSteps += effect.rangeSteps * appliedMetamagicIncrease(entry);
    if (effect.area) fx.areaMultiplier *= effect.area;
    if (effect.rider) riders.push({ name: def.name, line: riderText(effect.rider, spellLevel) });
  }
  riders.sort((a, b) => a.name.localeCompare(b.name));
  fx.riders = riders.map((r) => r.line);
  return fx;
}

/* ------------------------------------------------------------ dice caps -- */

/**
 * The caster level at which `cap` first binds `expr` — i.e. the lowest `@cl`
 * whose value reaches the cap. Used to translate Intensified Spell's "+5
 * levels" into the cap's own units: a spell that gains a die every level moves
 * its cap by 5, one that gains a die every OTHER level moves it by 2.
 * `null` when no caster level in the searched range reaches the cap (the
 * formula isn't shaped like a level-scaled dice count after all).
 */
function casterLevelAtCap(expr: FormulaNode, cap: number, data: RollData): number | null {
  for (let cl = 1; cl <= 60; cl++) {
    if (evaluateNode(expr, { ...data, cl }) >= cap) return cl;
  }
  return null;
}

/**
 * Rewrite the `min(cap, f(@cl))` guarding a dice term's COUNT so the cap sits
 * `levels` caster levels higher (Intensified Spell). Only dice counts are
 * touched: the feat raises "the maximum number of damage dice", not a spell's
 * flat per-level bonus, so a cure spell's `min(@cl, 10)` healing term is left
 * alone. A formula with no such cap comes back unchanged, which is the right
 * answer — the feat does nothing for a spell whose damage isn't capped.
 */
function raiseDiceCap(node: FormulaNode, levels: number, data: RollData): FormulaNode {
  switch (node.kind) {
    case "dice":
      return { ...node, count: raiseCapsIn(node.count, levels, data) };
    case "unary":
      return { ...node, operand: raiseDiceCap(node.operand, levels, data) };
    case "bin":
      return {
        ...node,
        left: raiseDiceCap(node.left, levels, data),
        right: raiseDiceCap(node.right, levels, data),
      };
    case "call":
      return { ...node, args: node.args.map((a) => raiseDiceCap(a, levels, data)) };
    default:
      return node;
  }
}

/** The `min(cap, f(@cl))` rewrite itself, applied inside a dice term's count. */
function raiseCapsIn(node: FormulaNode, levels: number, data: RollData): FormulaNode {
  if (node.kind === "call" && node.name === "min" && node.args.length === 2) {
    const [a, b] = node.args as [FormulaNode, FormulaNode];
    // Either argument order appears in the vendored data: `min(10, @cl)` and
    // `min(floor(@cl / 3), 6)` are both used.
    const litIndex = a.kind === "num" ? 0 : b.kind === "num" ? 1 : -1;
    if (litIndex >= 0) {
      const lit = (litIndex === 0 ? a : b) as { kind: "num"; value: number };
      const expr = litIndex === 0 ? b : a;
      const at = casterLevelAtCap(expr, lit.value, data);
      const raised =
        at === null ? lit.value + levels : evaluateNode(expr, { ...data, cl: at + levels });
      const next: FormulaNode = { kind: "num", value: raised };
      return { ...node, args: litIndex === 0 ? [next, expr] : [expr, next] };
    }
  }
  if (node.kind === "call") {
    return { ...node, args: node.args.map((a) => raiseCapsIn(a, levels, data)) };
  }
  if (node.kind === "bin") {
    return {
      ...node,
      left: raiseCapsIn(node.left, levels, data),
      right: raiseCapsIn(node.right, levels, data),
    };
  }
  if (node.kind === "unary") return { ...node, operand: raiseCapsIn(node.operand, levels, data) };
  return node;
}

/* --------------------------------------------------------------- damage -- */

/**
 * A multiplier as the percentage it adds, the way the rules phrase it and the
 * way a player says it: Empower Spell's 1.5 reads `"+50%"`. A `×1.5` suffix
 * would collide with the `×N` a multi-projectile spell already appends to its
 * damage chip (Magic Missile's missiles, Scorching Ray's rays).
 */
function formatMultiplier(n: number): string {
  return `+${Number(((n - 1) * 100).toFixed(2))}%`;
}

/**
 * The damage text for one damage part with metamagic applied, e.g. Fireball's
 * `(min(10, @cl))d6` at CL 10 reading `"10d6 +50%"` empowered, `"60"`
 * maximized, `"60 + half of 10d6"` both (CRB: "the maximum result plus half
 * the normally rolled result"), and `"15d6"` intensified at CL 15.
 *
 * `flat` is added to the part's modifier before any of that — pass Furious
 * Spell's `flatDamage` on the FIRST part only, since the feat adds its damage
 * once per target rather than once per damage line.
 *
 * `null` when nothing resolves, so callers can drop the part rather than print
 * DSL source at a player. Empower and Maximize deliberately do nothing to a
 * formula with no dice in it: both feats change "variable, numeric effects",
 * and a fixed number is neither.
 */
export function metamagicDamageText(
  formula: string,
  data: RollData,
  fx: MetamagicSpellEffects,
  flat = 0,
): string | null {
  let node = parseFormula(formula);
  if (fx.diceCapLevels > 0) node = raiseDiceCap(node, fx.diceCapLevels, data);

  const chain = diceChainOf(node, data);
  if (!chain) {
    let value: number;
    try {
      value = evaluateNode(node, data);
    } catch {
      return null;
    }
    return String(value + flat);
  }

  const modifier = chain.modifier + flat;
  const rolled = formatDiceChain(chain, modifier);
  if (!fx.maximize && fx.numericMultiplier === 1) return rolled;

  const maximum = chain.terms.reduce((sum, t) => sum + t.sign * t.count * t.faces, 0) + modifier;
  if (!fx.maximize) return `${rolled} ${formatMultiplier(fx.numericMultiplier)}`;
  if (fx.numericMultiplier === 1) return String(maximum);
  return `${maximum} + half of ${rolled}`;
}

/* ---------------------------------------------------------------- range -- */

/** Range categories Reach Spell climbs through, in order. */
export const REACH_RANGE_ORDER = ["touch", "close", "medium", "long"] as const;

/**
 * The range band Reach Spell moves `units` up to, capped at long. Returns
 * `units` unchanged for a range the feat doesn't touch (personal, a fixed
 * distance, unlimited) — RAW it only alters touch, close, and medium.
 */
export function reachRangeUnits(units: string, steps: number): string {
  if (steps <= 0) return units;
  const at = REACH_RANGE_ORDER.indexOf(units as (typeof REACH_RANGE_ORDER)[number]);
  if (at < 0) return units;
  return REACH_RANGE_ORDER[Math.min(at + steps, REACH_RANGE_ORDER.length - 1)]!;
}

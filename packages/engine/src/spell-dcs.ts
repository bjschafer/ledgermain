/**
 * Spell-save-DC bonuses and caster-level-check bonuses — the two caster-facing
 * modifier families that previously had no `Change.target` to land on (Spell
 * Focus and Spell Penetration sat in `feat-classification.ts` as "blocked" for
 * exactly this reason).
 *
 * Unlike `ability-dcs.ts` (which computes ABSOLUTE DC lines for seven class
 * abilities), there is no headline number to compute here: a spell's DC is
 * `10 + spell level + casting ability mod`, resolved per spell where the spell
 * is displayed (`apps/web`'s `spellcasting.ts`), and a CL check's base is the
 * caster level the displaying panel already has. So this module only resolves
 * the BONUS terms, with provenance, and the display layer folds them in.
 *
 * Target vocabulary (this engine's own convention, not vendored Foundry
 * vocabulary — registered in `targets.ts`):
 *
 *  - `spellDC` — every spell save DC, any school.
 *  - `spellDC.<school>` — spells of one school only; `<school>` is a
 *    {@link SPELL_SCHOOLS} key (`"evocation"`, ...), chosen to match the
 *    school-choice ids `apps/web`'s feat picker already stores for Spell
 *    Focus, NOT the vendored `Spell.school` abbreviation (`"evo"` — carried
 *    as `tag` on the derived line so displays can match spells).
 *  - `clCheck` — every caster level check.
 *  - `clCheck.sr` — checks to overcome spell resistance only.
 *  - `clCheck.dispel` — dispel checks only.
 *
 * Deliberately NOT here: the `cl` target (caster level itself — moving it
 * would change durations, ranges, and damage everywhere; it stays an
 * unapplied target, see `targets.ts`), descriptor/energy-type-scoped DC
 * bonuses (Elemental Focus — a different axis than school, no vocabulary for
 * it yet), and per-school caster LEVEL bonuses (Varisian Tattoo — those are
 * `cl` changes, not check bonuses, whatever their scope).
 */

import type {
  DerivedClCheckBonus,
  DerivedClChecks,
  DerivedSpellDCs,
  DerivedSpellSchoolDC,
} from "@pf1/schema";

import { forTarget, type CollectedModifier } from "./collect.js";
import { resolveStack, toComponents } from "./stacking.js";

export interface SpellSchoolDef {
  /** Player-facing name, e.g. "Evocation". */
  label: string;
  /** Vendored `Spell.school` abbreviation, e.g. "evo". */
  tag: string;
}

/**
 * The eight schools of magic (PF1 CRB — clean-room list of standard rules
 * category names). Keys double as the `spellDC.<key>` target suffix and match
 * the school-choice ids stored in `doc.build.featChoices` for Spell Focus.
 * The vendored data's ninth `Spell.school` value, `"uni"` (universal), is
 * deliberately absent: there is no school-scoped bonus to universal spells in
 * PF1 (Spell Focus offers no such pick), and an all-schools `spellDC` bonus
 * reaches universal spells through `DerivedSpellDCs.all` anyway.
 */
export const SPELL_SCHOOLS: Readonly<Record<string, SpellSchoolDef>> = {
  abjuration: { label: "Abjuration", tag: "abj" },
  conjuration: { label: "Conjuration", tag: "con" },
  divination: { label: "Divination", tag: "div" },
  enchantment: { label: "Enchantment", tag: "enc" },
  evocation: { label: "Evocation", tag: "evo" },
  illusion: { label: "Illusion", tag: "ill" },
  necromancy: { label: "Necromancy", tag: "nec" },
  transmutation: { label: "Transmutation", tag: "trs" },
};

/** The `Change.target` for a spell-DC modifier — all schools, or one school key. */
export function spellDCTarget(schoolKey?: string): string {
  return schoolKey === undefined ? "spellDC" : `spellDC.${schoolKey}`;
}

/** The `Change.target` for a CL-check modifier — all checks, or one kind. */
export function clCheckTarget(kind?: "sr" | "dispel"): string {
  return kind === undefined ? "clCheck" : `clCheck.${kind}`;
}

/**
 * Resolve every spell-DC bonus the character has. Each school line stacks the
 * all-schools modifiers TOGETHER WITH that school's scoped ones (one
 * `resolveStack` over the union), so same-type bonuses across the two scopes
 * compete instead of double-applying — a display consumer adds exactly one of
 * `all` or the matching school's `bonus` to a spell's base DC.
 *
 * `undefined` (field omitted from the sheet) when nothing targets `spellDC`
 * or any `spellDC.<school>`.
 */
export function computeSpellDCs(collected: CollectedModifier[]): DerivedSpellDCs | undefined {
  const allMods = forTarget(collected, spellDCTarget());
  const schools: DerivedSpellSchoolDC[] = [];
  for (const [key, def] of Object.entries(SPELL_SCHOOLS)) {
    const scoped = forTarget(collected, spellDCTarget(key));
    if (scoped.length === 0) continue;
    const stack = resolveStack([...allMods, ...scoped]);
    schools.push({
      key,
      tag: def.tag,
      label: def.label,
      bonus: stack.total,
      components: toComponents(stack.modifiers),
    });
  }
  if (allMods.length === 0 && schools.length === 0) return undefined;
  const allStack = resolveStack(allMods);
  return {
    all: allStack.total,
    allComponents: toComponents(allStack.modifiers),
    schools,
  };
}

/**
 * Resolve caster-level-check bonuses: `sr` (overcome spell resistance) and
 * `dispel` each fold general `clCheck` modifiers in with their own scoped
 * ones, same union-stack shape as {@link computeSpellDCs}. `undefined` when
 * nothing targets any of the three.
 */
export function computeClChecks(collected: CollectedModifier[]): DerivedClChecks | undefined {
  const general = forTarget(collected, clCheckTarget());
  const build = (kind: "sr" | "dispel"): DerivedClCheckBonus | undefined => {
    const scoped = forTarget(collected, clCheckTarget(kind));
    if (general.length === 0 && scoped.length === 0) return undefined;
    const stack = resolveStack([...general, ...scoped]);
    return { bonus: stack.total, components: toComponents(stack.modifiers) };
  };
  const sr = build("sr");
  const dispel = build("dispel");
  if (!sr && !dispel) return undefined;
  return { ...(sr ? { sr } : {}), ...(dispel ? { dispel } : {}) };
}

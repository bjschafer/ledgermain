/**
 * DR / energy resistance / spell resistance derivation (issue #21),
 * display-only — nothing here feeds back into damage/attack math.
 *
 * Sources, all flowing in through the same `collectModifiers` pipeline as
 * every other change target (race/item/class-feature/buff/condition — see
 * `collect.ts`), plus one hand-authored class feature:
 *
 *   - `spellResist` — the only SR-ish target that actually occurs in the
 *     vendored slice (Diamond Soul class feature, a "Spell Resistance" buff,
 *     and three Robe of the Archmagi item variants). No `dr`/`eres`-shaped
 *     target occurs anywhere in the vendored data today (races/items/class-
 *     features/buffs) — DR and energy resistance are not modeled via
 *     Foundry `changes[]` in this system at all upstream. `dr` / `dr.<bypass>`
 *     / `eres.<energy>` are this engine's own convention (mirroring the
 *     existing `skill.<id>` prefix family) so a user-authored buff CAN grant
 *     them; see BuffsPanel.
 *   - Barbarian Damage Reduction — hand-authored progression, clean-room from
 *     the SRD (the vendored class feature's `changes[]` is empty; see
 *     `tables.ts` `barbarianDamageReduction`).
 *
 * PF1 rule reused for grouping: DR/energy-resistance from multiple sources of
 * the *same* qualifier does not stack — only the single highest value applies.
 * That is a different rule than typed-bonus stacking (`stacking.ts`), so it is
 * reimplemented here rather than routed through `resolveStack` (whose
 * "untyped always sums" behavior is correct for ability/skill bonuses but
 * wrong for DR/resistance qualifiers).
 */

import type { CharacterDoc, Defenses, DefenseEntry, ModifierComponent, RefData } from "@pf1/schema";

import { barbarianDamageReductionReplaced } from "./archetypes.js";
import type { CollectedModifier } from "./collect.js";
import { forTarget } from "./collect.js";
import { resolveStack } from "./stacking.js";
import { barbarianDamageReduction } from "./tables.js";

const DR_TARGET = "dr";
const DR_PREFIX = "dr.";
const ERES_PREFIX = "eres.";

function isDrTarget(target: string): boolean {
  return target === DR_TARGET || target.startsWith(DR_PREFIX);
}

function drQualifier(target: string): string {
  return target === DR_TARGET ? "—" : target.slice(DR_PREFIX.length);
}

function isEresTarget(target: string): boolean {
  return target.startsWith(ERES_PREFIX);
}

function eresQualifier(target: string): string {
  return target.slice(ERES_PREFIX.length);
}

interface QualifiedMod {
  qualifier: string;
  type: string;
  value: number;
  source: string;
  sourceId?: string;
}

/**
 * Groups modifiers by qualifier; within a qualifier, only the single highest
 * value applies (PF1 DR/energy-resistance from the same qualifier doesn't
 * stack). Losing entries stay in `components` with `applied: false`, the same
 * strike-through convention as typed-bonus stacking.
 */
function groupByQualifier(mods: QualifiedMod[]): DefenseEntry[] {
  const byQualifier = new Map<string, QualifiedMod[]>();
  for (const m of mods) {
    const list = byQualifier.get(m.qualifier);
    if (list) list.push(m);
    else byQualifier.set(m.qualifier, [m]);
  }

  const entries: DefenseEntry[] = [];
  for (const [qualifier, list] of byQualifier) {
    let bestIdx = 0;
    for (let i = 1; i < list.length; i++) {
      if (list[i]!.value > list[bestIdx]!.value) bestIdx = i;
    }
    const components: ModifierComponent[] = list.map((m, i) => ({
      source: m.source,
      sourceId: m.sourceId,
      type: m.type,
      value: m.value,
      applied: i === bestIdx,
    }));
    entries.push({ total: list[bestIdx]!.value, qualifier, components });
  }

  entries.sort((a, b) =>
    a.qualifier === "—" ? -1 : b.qualifier === "—" ? 1 : a.qualifier.localeCompare(b.qualifier),
  );
  return entries;
}

/**
 * Spell resistance: sources using Foundry's `operator: "set"` (every vendored
 * `spellResist` change does) replace the value outright rather than adding;
 * SR from multiple sources doesn't stack, so only the highest "set" value
 * applies (losers kept, unapplied, for provenance). Any plain additive change
 * (none occur upstream today, but the target supports it) stacks on top via
 * the normal typed-bonus resolver.
 */
function computeSr(
  collected: CollectedModifier[],
): { total: number; components: ModifierComponent[] } | undefined {
  const mods = forTarget(collected, "spellResist");
  if (mods.length === 0) return undefined;

  const setMods = mods.filter((m) => m.operator === "set");
  const addMods = mods.filter((m) => m.operator !== "set");
  const addStack = resolveStack(addMods);
  const addComponents: ModifierComponent[] = addStack.modifiers.map((m) => ({
    source: m.source,
    sourceId: m.sourceId,
    type: m.type,
    value: m.value,
    applied: m.applied,
  }));

  if (setMods.length === 0) {
    return { total: addStack.total, components: addComponents };
  }

  let bestIdx = 0;
  for (let i = 1; i < setMods.length; i++) {
    if (setMods[i]!.value > setMods[bestIdx]!.value) bestIdx = i;
  }
  const setComponents: ModifierComponent[] = setMods.map((m, i) => ({
    source: m.source,
    sourceId: m.sourceId,
    type: m.type,
    value: m.value,
    applied: i === bestIdx,
  }));

  return {
    total: setMods[bestIdx]!.value + addStack.total,
    components: [...setComponents, ...addComponents],
  };
}

/** Barbarian level, or 0 if the character has no barbarian levels. */
function barbarianLevel(doc: CharacterDoc): number {
  return doc.identity.classes.find((c) => c.tag === "barbarian")?.level ?? 0;
}

/**
 * Derives the display-only Defenses line. Returns `undefined` when the
 * character has no DR, no resistances, and no spell resistance at all — the
 * UI renders nothing rather than an empty "Defenses" row.
 */
export function computeDefenses(
  doc: CharacterDoc,
  refData: RefData,
  collected: CollectedModifier[],
): Defenses | undefined {
  const drMods: QualifiedMod[] = collected
    .filter((m) => isDrTarget(m.target))
    .map((m) => ({
      qualifier: drQualifier(m.target),
      type: m.type,
      value: m.value,
      source: m.source,
      sourceId: m.sourceId,
    }));

  const barbLevel = barbarianLevel(doc);
  // Issue #7: an archetype that replaces the barbarian's Damage Reduction
  // (Savage Barbarian, Wildborn, Invulnerable Rager, ...) must stop this
  // hardcoded progression from contributing — it isn't a vendored `Change`
  // (the class feature's `changes[]` is empty upstream), so the general
  // swap-suppression in `collect.ts` never touches it; this needs its own
  // check. See `barbarianDamageReductionReplaced`'s doc comment.
  if (barbLevel >= 7 && !barbarianDamageReductionReplaced(doc, refData)) {
    const { amount } = barbarianDamageReduction(barbLevel);
    if (amount > 0) {
      drMods.push({
        qualifier: "—",
        type: "untyped",
        value: amount,
        source: "Damage Reduction",
        sourceId: "barbarian-dr",
      });
    }
  }

  const eresMods: QualifiedMod[] = collected
    .filter((m) => isEresTarget(m.target))
    .map((m) => ({
      qualifier: eresQualifier(m.target),
      type: m.type,
      value: m.value,
      source: m.source,
      sourceId: m.sourceId,
    }));

  const dr = groupByQualifier(drMods);
  const resistances = groupByQualifier(eresMods);
  const sr = computeSr(collected);

  if (dr.length === 0 && resistances.length === 0 && !sr) return undefined;
  return { dr, resistances, sr };
}

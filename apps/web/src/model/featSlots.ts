/**
 * Feat "slots" (issue #54 / #57): the character's feat budget decomposed into
 * typed buckets — "generic" (any feat), "combat" (Fighter), "wizardBonus"
 * (metamagic / item creation / Spell Mastery), "combatStyle" (Ranger's chosen
 * style tree), "bloodline" (Sorcerer's chosen bloodline list), "monkList"
 * (Monk's limited list) — and a greedy assignment of the character's chosen
 * feats into those slots, so the UI can show which typed slots are unfilled
 * and flag feats that don't fit any remaining slot.
 *
 * Pure, framework-agnostic, no DOM — same split as the rest of `model/`.
 * Nothing here hard-blocks a feat pick (hybrid soft-warning posture, per
 * CLAUDE.md): a character can still take any feat the picker allows; this
 * module only classifies and warns.
 *
 * Assignment is greedy, most-restrictive-slot-first: a bloodline's 8-feat
 * list is tried before Fighter's 214-feat "Combat" tag, which is tried before
 * the fully unrestricted "generic" bucket. This means a feat that could
 * satisfy either a restricted slot or a generic slot preferentially fills the
 * restricted one, leaving the generic slot free for something else — the
 * same intuition a player applies by hand. Assignment order is otherwise the
 * order feats were added (`doc.build.feats`), which is a simplification: a
 * feat eligible for two different open restricted slots (rare — e.g. a
 * multiclass ranger/fighter with both open Combat-style and Combat slots)
 * gets whichever slot type is scanned first, not necessarily the "best"
 * assignment. Since the total slot count is unaffected either way, this only
 * affects which specific slot gets credited, not whether the budget balances
 * — acceptable given the project's soft-warn, best-effort posture.
 */

import type { CharacterDoc, Feat, RefData } from "@pf1/schema";
import { BLOODLINES, featNameSlug, MONK_BONUS_FEAT_SLUGS } from "@pf1/engine";

import {
  baseFeatSlotCount,
  classBonusFeatSlots,
  GENERIC_SLOT,
  grantedFeats,
  type FeatSlotType,
} from "./feats.js";
import { COMBAT_STYLES } from "./ranger.js";

export type { FeatSlotType } from "./feats.js";

/** A typed group of feat slots, with the feats currently assigned to it. */
export interface FeatSlotGroup {
  /** Stable key for React lists / lookups, e.g. "combat", "bloodline:Draconic". */
  key: string;
  type: FeatSlotType;
  /** Short display label, e.g. "Combat feat", "Bloodline feat (Draconic)". */
  label: string;
  /** Total slots of this type the character's classes grant. */
  total: number;
  /** Class features / archetypes contributing to this group (display only). */
  sources: string[];
  /** Feat ids (from `doc.build.feats`) assigned to this group. */
  filledFeatIds: string[];
}

export interface FeatSlotAssignment {
  /** Most-restrictive-first, generic last (assignment order). */
  groups: FeatSlotGroup[];
  /**
   * Owned, non-granted feat ids that could not be placed in ANY slot
   * (including generic) — the character has more feats than their total
   * budget allows. Distinct from an unfilled typed slot (a slot with room
   * that nothing eligible was assigned to).
   */
  unassignedFeatIds: string[];
}

function slotKey(type: FeatSlotType): string {
  switch (type.kind) {
    case "generic":
      return "generic";
    case "combat":
      return "combat";
    case "wizardBonus":
      return "wizardBonus";
    case "magusBonus":
      return "magusBonus";
    case "monkList":
      return "monkList";
    case "combatStyle":
      return `combatStyle:${type.style}`;
    case "bloodline":
      return `bloodline:${type.bloodline}`;
  }
}

/** Short display label for a slot type, used as the group heading. */
export function slotTypeLabel(type: FeatSlotType): string {
  switch (type.kind) {
    case "generic":
      return "Feat";
    case "combat":
      return "Combat feat";
    case "wizardBonus":
      return "Wizard bonus feat (metamagic / item creation / Spell Mastery)";
    case "magusBonus":
      return "Magus bonus feat (combat / item creation / metamagic)";
    case "monkList":
      return "Monk bonus feat (limited list)";
    case "combatStyle": {
      const style = COMBAT_STYLES.find((s) => s.id === type.style);
      return `Combat style feat (${style?.label ?? type.style})`;
    }
    case "bloodline":
      return `Bloodline feat (${type.bloodline})`;
  }
}

/** Compact badge text for a slot type, for per-feat-row UI chips. */
export function slotTypeBadge(type: FeatSlotType): string {
  switch (type.kind) {
    case "generic":
      return "Feat";
    case "combat":
      return "Combat";
    case "wizardBonus":
      return "Wizard bonus";
    case "magusBonus":
      return "Magus bonus";
    case "monkList":
      return "Monk list";
    case "combatStyle": {
      const style = COMBAT_STYLES.find((s) => s.id === type.style);
      return `${style?.label ?? type.style} style`;
    }
    case "bloodline":
      return `${type.bloodline} bloodline`;
  }
}

/** Lower rank = tried first when assigning feats to slots (most restrictive first). */
function restrictivenessRank(type: FeatSlotType): number {
  switch (type.kind) {
    case "bloodline":
      return 0;
    case "combatStyle":
      return 1;
    case "monkList":
      return 2;
    case "wizardBonus":
    case "magusBonus":
      return 3;
    case "combat":
      return 4;
    case "generic":
      return 5;
  }
}

/**
 * Whether `feat` legally fills a slot of type `type`. `"generic"` always
 * returns true. A slot type whose restriction can't currently be resolved
 * (e.g. `bloodline` naming a tag absent from `BLOODLINES`, `combatStyle`
 * naming an unknown style id) returns false — inert rather than a crash,
 * matching the project's posture elsewhere for unrecognized ids.
 */
export function featEligibleForSlot(feat: Feat, type: FeatSlotType): boolean {
  const slug = featNameSlug(feat.name);
  switch (type.kind) {
    case "generic":
      return true;
    case "combat":
      return feat.tags.includes("Combat");
    case "wizardBonus":
      return (
        feat.tags.includes("Metamagic") ||
        feat.tags.includes("Item Creation") ||
        slug === "spell-mastery"
      );
    case "magusBonus":
      return (
        feat.tags.includes("Combat") ||
        feat.tags.includes("Metamagic") ||
        feat.tags.includes("Item Creation")
      );
    case "monkList":
      return MONK_BONUS_FEAT_SLUGS.includes(slug);
    case "combatStyle": {
      const style = COMBAT_STYLES.find((s) => s.id === type.style);
      return style ? style.featSlugs.includes(slug) : false;
    }
    case "bloodline": {
      const bloodline = BLOODLINES[type.bloodline];
      return bloodline ? bloodline.bonusFeatSlugs.includes(slug) : false;
    }
  }
}

/**
 * Builds the character's feat slot groups (empty `filledFeatIds` — see
 * `assignFeatsToSlots` for the filled version). Generic-typed class-bonus
 * contributions (an unrecognized `bonusFeats` feature, or a Ranger/Sorcerer
 * who hasn't chosen a style/bloodline yet) are folded into the single
 * trailing "generic" group alongside the base level/Human/GM-grant slots.
 */
export function buildFeatSlotGroups(doc: CharacterDoc, refData: RefData): FeatSlotGroup[] {
  const contributions = classBonusFeatSlots(doc, refData);
  let genericTotal = baseFeatSlotCount(doc, refData);
  const byKey = new Map<string, { type: FeatSlotType; total: number; sources: Set<string> }>();

  for (const contrib of contributions) {
    if (contrib.type.kind === "generic") {
      genericTotal += contrib.count;
      continue;
    }
    const key = slotKey(contrib.type);
    const existing = byKey.get(key);
    if (existing) {
      existing.total += contrib.count;
      existing.sources.add(contrib.source);
    } else {
      byKey.set(key, {
        type: contrib.type,
        total: contrib.count,
        sources: new Set([contrib.source]),
      });
    }
  }

  const groups: FeatSlotGroup[] = [...byKey.entries()]
    .filter(([, v]) => v.total > 0)
    .map(([key, v]) => ({
      key,
      type: v.type,
      label: slotTypeLabel(v.type),
      total: v.total,
      sources: [...v.sources],
      filledFeatIds: [] as string[],
    }))
    .sort((a, b) => restrictivenessRank(a.type) - restrictivenessRank(b.type));

  // Generic bucket always trails (highest restrictiveness rank) — append
  // after sorting the typed groups so it's tried last during assignment.
  // Shown even at 0 total feats/classes so the UI has something to render.
  groups.push({
    key: slotKey(GENERIC_SLOT),
    type: GENERIC_SLOT,
    label: slotTypeLabel(GENERIC_SLOT),
    total: Math.max(0, genericTotal),
    sources: [],
    filledFeatIds: [],
  });

  return groups;
}

/**
 * Greedily assigns the character's chosen, non-granted feats to slot groups
 * (most-restrictive group first — see file doc comment), then reports which
 * groups have unfilled slots and which chosen feats didn't fit anywhere.
 */
export function assignFeatsToSlots(doc: CharacterDoc, refData: RefData): FeatSlotAssignment {
  const groups = buildFeatSlotGroups(doc, refData);
  const grantedIds = new Set(grantedFeats(doc, refData).map((g) => g.featId));
  const unassignedFeatIds: string[] = [];

  for (const featId of doc.build.feats) {
    if (grantedIds.has(featId)) continue; // fixed grants never consume a slot
    const feat = refData.feats[featId];
    if (!feat) continue; // stale/unknown feat id — nothing to classify
    const target = groups.find(
      (g) => g.filledFeatIds.length < g.total && featEligibleForSlot(feat, g.type),
    );
    if (target) {
      target.filledFeatIds.push(featId);
    } else {
      unassignedFeatIds.push(featId);
    }
  }

  return { groups, unassignedFeatIds };
}

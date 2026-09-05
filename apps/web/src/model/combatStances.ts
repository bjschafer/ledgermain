import {
  COMBAT_STANCE_IDS,
  COMBAT_STANCE_REFERENCE_BUFF_IDS,
  combatStanceIdForActiveBuff,
  combatStyleEffectTag,
  isCombatStanceActiveBuff,
  featNameSlug,
  isCombatStyleEffectTag,
  resolveFeatEffect,
  withGrantedFeats,
  type CombatStance,
  type CombatStanceId,
} from "@pf1/engine";
import type { CharacterDoc, Feat, RefData } from "@pf1/schema";

import { toggleTableBuff } from "./buffs.js";

/** The selected combat stance, tolerating an old/corrupt doc with more than one. */
export function activeCombatStanceId(doc: CharacterDoc): CombatStanceId | undefined {
  const activeIds = new Set(
    doc.live.activeBuffs
      .map(combatStanceIdForActiveBuff)
      .filter((id): id is CombatStanceId => id !== undefined),
  );
  return COMBAT_STANCE_IDS.find((id) => activeIds.has(id));
}

/**
 * Toggle one of the universal combat stances. The actions are mutually
 * exclusive, so switching first removes every stance-tagged active buff while
 * preserving spells, class toggles, and user-authored buffs.
 */
export function toggleCombatStance(doc: CharacterDoc, stance: CombatStance): CharacterDoc {
  const alreadyActive = doc.live.activeBuffs.some(
    (buff) => combatStanceIdForActiveBuff(buff) === stance.id,
  );
  const withoutStances: CharacterDoc = {
    ...doc,
    live: {
      ...doc.live,
      activeBuffs: doc.live.activeBuffs.filter((buff) => !isCombatStanceActiveBuff(buff)),
    },
  };
  return alreadyActive ? withoutStances : toggleTableBuff(withoutStances, stance);
}

export interface OwnedCombatStyle {
  featId: string;
  name: string;
  description: string;
  effectTag: string;
  /** Switching this style on changes numbers, rather than only surfacing its rules. */
  movesNumbers: boolean;
  /** Those numbers apply to the combat action currently selected. */
  appliesToActiveStance: boolean;
}

/**
 * Which style tags an owned feat actually gates a modifier on, and whether
 * that modifier reaches the selected combat action.
 *
 * Read off the gates rather than a list of feat names: a style is mechanical
 * exactly when some owned feat carries a change whose `requiredEffectTags`
 * names its tag (Crane Style today), so a style modeled later earns its badge
 * without anybody remembering to come back here. The gate's OR group is the
 * set of actions the modifier applies to, so an empty one means every action.
 */
function styleInteractions(
  doc: CharacterDoc,
  refData: RefData,
  featIds: readonly string[],
  activeStanceId: CombatStanceId | undefined,
): Map<string, boolean> {
  const referenceBuffIds: Partial<Record<CombatStanceId, string>> =
    COMBAT_STANCE_REFERENCE_BUFF_IDS;
  const activeMatchers = new Set<string>();
  if (activeStanceId) {
    activeMatchers.add(activeStanceId);
    const referenceBuffId = referenceBuffIds[activeStanceId];
    if (referenceBuffId) activeMatchers.add(referenceBuffId);
  }

  const interactions = new Map<string, boolean>();
  for (const featId of featIds) {
    const feat: Feat | undefined = refData.feats[featId];
    if (!feat) continue;
    const resolved = resolveFeatEffect(featNameSlug(feat.name));
    if (!resolved) continue;
    const choiceId = doc.build.featChoices?.[featId];
    const changes =
      resolved.entry.type === "static"
        ? resolved.entry.changes
        : resolved.entry.type === "choice" && choiceId
          ? resolved.entry.build(choiceId)
          : [];
    for (const change of changes) {
      const gate = change.activeWhenBuff;
      if (!gate?.requiredEffectTags) continue;
      const orGroup = [...(gate.buffIds ?? []), ...(gate.effectTags ?? [])];
      const applies = orGroup.length === 0 || orGroup.some((m) => activeMatchers.has(m));
      for (const tag of gate.requiredEffectTags) {
        if (!isCombatStyleEffectTag(tag)) continue;
        interactions.set(tag, (interactions.get(tag) ?? false) || applies);
      }
    }
  }
  return interactions;
}

/**
 * Every distinct Combat + Style tagged feat the character owns, including
 * fixed class grants, ordered so the ones that change the selected action's
 * numbers come first and the rest stay alphabetical.
 */
export function ownedCombatStyles(
  doc: CharacterDoc,
  refData: RefData,
  activeStanceId?: CombatStanceId,
): OwnedCombatStyle[] {
  const effective = withGrantedFeats(doc, refData);
  const featIds = [
    ...(effective.build.feats ?? []),
    ...(effective.build.extraFeats ?? []).map((entry) => entry.featId),
  ];
  const interactions = styleInteractions(doc, refData, featIds, activeStanceId);
  const seen = new Set<string>();
  const styles: OwnedCombatStyle[] = [];
  for (const featId of featIds) {
    if (seen.has(featId)) continue;
    seen.add(featId);
    const feat: Feat | undefined = refData.feats[featId];
    if (!feat?.tags?.includes("Combat") || !feat.tags.includes("Style")) continue;
    const effectTag = combatStyleEffectTag(featNameSlug(feat.name));
    styles.push({
      featId,
      name: feat.name,
      description: feat.description ?? "",
      effectTag,
      movesNumbers: interactions.has(effectTag),
      appliesToActiveStance: interactions.get(effectTag) ?? false,
    });
  }
  return styles.sort(
    (a, b) =>
      Number(b.appliesToActiveStance) - Number(a.appliesToActiveStance) ||
      Number(b.movesNumbers) - Number(a.movesNumbers) ||
      a.name.localeCompare(b.name),
  );
}

export function activeCombatStyleTags(doc: CharacterDoc): Set<string> {
  return new Set(
    doc.live.activeBuffs
      .map((buff) => buff.effectTag)
      .filter((tag): tag is string => isCombatStyleEffectTag(tag)),
  );
}

const MASTER_OF_MANY_STYLES = "monk:master-of-many-styles";

/**
 * How many style feat stances the character can hold at once.
 *
 * One by default: entering a style is a swift action, and a second replaces
 * the first. The monk's Master of Many Styles archetype is the exception the
 * rules spell out, and it spells out the whole schedule with it. Fuse Style
 * fuses two styles at 1st, three at 8th, and four at 15th; Perfect Style takes
 * it to five at 20th.
 */
export function maxActiveCombatStyles(doc: CharacterDoc): number {
  if (!(doc.build.archetypes ?? []).includes(MASTER_OF_MANY_STYLES)) return 1;
  const monkLevel = doc.identity.classes.find((c) => c.tag === "monk")?.level ?? 0;
  if (monkLevel >= 20) return 5;
  if (monkLevel >= 15) return 4;
  if (monkLevel >= 8) return 3;
  return monkLevel >= 1 ? 2 : 1;
}

/**
 * Toggle one owned style, holding the character to the number of stances they
 * can actually keep up. Entering one past the limit drops the stance entered
 * longest ago, which is the closest a sheet gets to Fuse Style's "choose one
 * whose stance persists" without asking mid-combat.
 */
export function toggleCombatStyle(doc: CharacterDoc, style: OwnedCombatStyle): CharacterDoc {
  const option = {
    id: style.effectTag,
    name: style.name,
    changes: [],
    contextNotes: [
      {
        target: "allChecks" as const,
        text: "This combat style is active; see its feat text for its rules.",
      },
    ],
  };
  if (doc.live.activeBuffs.some((buff) => buff.effectTag === style.effectTag)) {
    return toggleTableBuff(doc, option);
  }

  const activeStyles = doc.live.activeBuffs.filter((buff) =>
    isCombatStyleEffectTag(buff.effectTag),
  );
  const overflow = activeStyles.length - (maxActiveCombatStyles(doc) - 1);
  if (overflow <= 0) return toggleTableBuff(doc, option);

  // activeBuffs is insertion-ordered, so the front of the list is the oldest.
  const dropped = new Set(activeStyles.slice(0, overflow).map((buff) => buff.instanceId));
  const trimmed: CharacterDoc = {
    ...doc,
    live: {
      ...doc.live,
      activeBuffs: doc.live.activeBuffs.filter((buff) => !dropped.has(buff.instanceId)),
    },
  };
  return toggleTableBuff(trimmed, option);
}

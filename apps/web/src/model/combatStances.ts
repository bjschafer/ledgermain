import {
  COMBAT_STANCE_IDS,
  combatStanceIdForActiveBuff,
  combatStyleEffectTag,
  isCombatStanceActiveBuff,
  featNameSlug,
  isCombatStyleEffectTag,
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
}

/** Every distinct Combat + Style tagged feat the character owns, including fixed class grants. */
export function ownedCombatStyles(doc: CharacterDoc, refData: RefData): OwnedCombatStyle[] {
  const effective = withGrantedFeats(doc, refData);
  const featIds = [
    ...(effective.build.feats ?? []),
    ...(effective.build.extraFeats ?? []).map((entry) => entry.featId),
  ];
  const seen = new Set<string>();
  const styles: OwnedCombatStyle[] = [];
  for (const featId of featIds) {
    if (seen.has(featId)) continue;
    seen.add(featId);
    const feat: Feat | undefined = refData.feats[featId];
    if (!feat?.tags?.includes("Combat") || !feat.tags.includes("Style")) continue;
    styles.push({
      featId,
      name: feat.name,
      description: feat.description ?? "",
      effectTag: combatStyleEffectTag(featNameSlug(feat.name)),
    });
  }
  return styles.sort((a, b) => a.name.localeCompare(b.name));
}

export function activeCombatStyleTags(doc: CharacterDoc): Set<string> {
  return new Set(
    doc.live.activeBuffs
      .map((buff) => buff.effectTag)
      .filter((tag): tag is string => isCombatStyleEffectTag(tag)),
  );
}

/** Toggle one owned style independently; class features may permit several at once. */
export function toggleCombatStyle(doc: CharacterDoc, style: OwnedCombatStyle): CharacterDoc {
  return toggleTableBuff(doc, {
    id: style.effectTag,
    name: style.name,
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "This combat style is active; see its feat text for its rules.",
      },
    ],
  });
}

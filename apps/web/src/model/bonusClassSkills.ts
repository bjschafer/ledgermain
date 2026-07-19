/**
 * Pure player-chosen bonus class skill transitions (issue #93).
 *
 * The engine owns which features grant picks and how many
 * (`BONUS_CLASS_SKILL_GRANTS` / `collectBonusClassSkillGrants`) plus the
 * truncate-to-entitlement read path; this module is the builder's side —
 * slot-indexed writes and the "which skills are still worth picking" question
 * the picker needs.
 */

import { collectBonusClassSkillGrants, skillBaseId } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

export { collectBonusClassSkillGrants };

/**
 * Set (or clear, with `null`/empty string) the pick at `slotIndex` under
 * `key` (a granting feature's name slug).
 *
 * Gaps are filled with empty strings rather than left sparse, and trailing
 * empties are trimmed, mirroring `rogueSkillUnlocks.ts`'s fixed-index shape:
 * a slot's index IS its grant order, so slot 2 must stay slot 2 when slot 1
 * is cleared.
 */
export function setBonusClassSkill(
  doc: CharacterDoc,
  key: string,
  slotIndex: number,
  skillId: string | null,
): CharacterDoc {
  if (slotIndex < 0) return doc;
  const all = { ...doc.build.bonusClassSkills };
  const current = [...(all[key] ?? [])];
  while (current.length <= slotIndex) current.push("");
  current[slotIndex] = typeof skillId === "string" ? skillId.trim() : "";
  while (current.length > 0 && !current[current.length - 1]) current.pop();

  if (current.length > 0) all[key] = current;
  else delete all[key];

  return {
    ...doc,
    build: {
      ...doc.build,
      bonusClassSkills: Object.keys(all).length > 0 ? all : undefined,
    },
  };
}

/**
 * Class skills the character already has from a source OTHER than these
 * picks — the character's classes and race.
 *
 * The picker greys these out: spending a pick on a skill that's already a
 * class skill is strictly wasted (the +3 doesn't stack with itself), and the
 * rules text says "a NEW class skill". Ids are base ids, so a parameterized
 * instance is checked via `skillBaseId`.
 */
export function existingClassSkills(doc: CharacterDoc, refData: RefData): Set<string> {
  const set = new Set<string>();
  for (const cls of doc.identity.classes) {
    const def = Object.values(refData.classes).find((c) => c.tag === cls.tag);
    for (const s of def?.classSkills ?? []) set.add(s);
  }
  for (const s of refData.races[doc.identity.race]?.classSkills ?? []) set.add(s);
  return set;
}

/** Whether `skillId` is already a class skill from a non-pick source. */
export function isExistingClassSkill(existing: ReadonlySet<string>, skillId: string): boolean {
  return existing.has(skillId) || existing.has(skillBaseId(skillId));
}

/**
 * Picks that are no longer valid and should be re-chosen: a slot holding a
 * skill another slot already took, or one that became a class skill from
 * another source after it was picked (a later class level, a race swap).
 * Advisory only — the builder shows a warning; nothing is auto-cleared, since
 * silently rewriting a player's choices is worse than telling them.
 */
export function staleBonusClassSkillPicks(
  doc: CharacterDoc,
  refData: RefData,
): { key: string; slotIndex: number; skillId: string; reason: "duplicate" | "already" }[] {
  const existing = existingClassSkills(doc, refData);
  const stale: {
    key: string;
    slotIndex: number;
    skillId: string;
    reason: "duplicate" | "already";
  }[] = [];
  const seen = new Set<string>();

  for (const grant of collectBonusClassSkillGrants(doc, refData)) {
    const picks = (doc.build.bonusClassSkills?.[grant.key] ?? []).slice(0, grant.slots);
    picks.forEach((skillId, slotIndex) => {
      if (!skillId) return;
      if (isExistingClassSkill(existing, skillId)) {
        stale.push({ key: grant.key, slotIndex, skillId, reason: "already" });
      } else if (seen.has(skillId)) {
        stale.push({ key: grant.key, slotIndex, skillId, reason: "duplicate" });
      }
      seen.add(skillId);
    });
  }

  return stale;
}

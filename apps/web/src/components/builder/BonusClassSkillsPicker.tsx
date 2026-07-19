import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  collectBonusClassSkillGrants,
  existingClassSkills,
  isExistingClassSkill,
  setBonusClassSkill,
  staleBonusClassSkillPicks,
} from "../../model/bonusClassSkills.js";
import { SKILL_NAMES } from "../../model/names.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface BonusClassSkillsPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

const SKILL_OPTIONS = Object.entries(SKILL_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

/**
 * Player-chosen bonus class skills (issue #93) — generic across every feature
 * that hands out a class-skill pick (`BONUS_CLASS_SKILL_GRANTS`), rendered
 * once per active grant. Renders nothing when the character has no such
 * feature, so it can sit unconditionally in ClassesSection.
 *
 * Skills that are already class skills from another source are disabled
 * rather than hidden: seeing why a skill isn't pickable beats it silently
 * missing from the list. Picks the character is no longer entitled to (a
 * level-down) drop out of the visible slots but stay in the doc — see
 * `CharacterDoc.build.bonusClassSkills`.
 */
export function BonusClassSkillsPicker({ doc, refData, update }: BonusClassSkillsPickerProps) {
  const grants = collectBonusClassSkillGrants(doc, refData);
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Bonus Class Skills", false);

  if (grants.length === 0) return null;

  const existing = existingClassSkills(doc, refData);
  // Picks that stopped being valid after the fact (a later class level made
  // the skill a class skill anyway, or the same skill got picked twice).
  // Advisory: flagged in place, never auto-cleared.
  const stale = new Map(
    staleBonusClassSkillPicks(doc, refData).map((s) => [`${s.key}:${s.slotIndex}`, s.reason]),
  );

  return (
    <div className="subsection bonus-class-skills-picker">
      <div
        className="subsection-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggleCollapsed();
        }}
        aria-expanded={!collapsed}
      >
        <h3>Bonus Class Skills</h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint">
            Skills chosen here count as class skills, granting the usual +3 once you have at least
            one rank in them. Skills that are already class skills are unavailable — the +3 doesn't
            stack with itself.
          </p>
          {grants.map((grant) => {
            const picks = doc.build.bonusClassSkills?.[grant.key] ?? [];
            const chosenElsewhere = new Set(picks.filter(Boolean));
            return (
              <div className="bonus-class-skill-grant" key={grant.key}>
                <h4>{grant.source}</h4>
                {Array.from({ length: grant.slots }, (_, slotIndex) => {
                  const chosen = picks[slotIndex] ?? "";
                  const staleReason = stale.get(`${grant.key}:${slotIndex}`);
                  return (
                    <div className="bonus-class-skill-slot" key={slotIndex}>
                      <label>
                        <span className="hint">Pick {slotIndex + 1}</span>
                        <select
                          value={chosen}
                          onChange={(e) =>
                            update((d) =>
                              setBonusClassSkill(d, grant.key, slotIndex, e.target.value || null),
                            )
                          }
                        >
                          <option value="">— none chosen —</option>
                          {SKILL_OPTIONS.map(([id, name]) => {
                            const taken =
                              isExistingClassSkill(existing, id) ||
                              (chosenElsewhere.has(id) && id !== chosen);
                            return (
                              <option key={id} value={id} disabled={taken}>
                                {name}
                                {taken ? " (already a class skill)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      {staleReason && (
                        <p className="hint warn-over">
                          {staleReason === "already"
                            ? "Already a class skill from another source — this pick is doing nothing."
                            : "Picked twice — the second one is doing nothing."}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

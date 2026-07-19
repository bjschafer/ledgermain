import { ROGUE_SKILL_UNLOCK_LEVELS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { SKILL_NAMES } from "../../model/names.js";
import {
  rogueUnchainedLevel,
  setRogueSkillUnlock,
  unlockedRogueSkillUnlockTiers,
} from "../../model/rogueSkillUnlocks.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RogueSkillUnlocksPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

const SKILL_OPTIONS = Object.entries(SKILL_NAMES).sort((a, b) => a[1].localeCompare(b[1]));

/**
 * Rogue's Edge (UC) skill unlock picks (issue #65 — previously deferred).
 * PF1 Unchained RAW: at 5th level, and every 5 levels thereafter (10th,
 * 15th, 20th), choose a skill (with at least 5 ranks) to gain a skill unlock
 * power for. The unlock's own tiered prose effects are NOT modeled — this
 * picker only records WHICH skill was chosen at each tier, displayed here
 * (deliberately NOT also duplicated onto the skill row or the Class Features
 * list — see `CharacterDoc.build.rogueSkillUnlocks`'s doc comment for why).
 * Free-choice — no validation of the "5 ranks" prerequisite.
 */
export function RogueSkillUnlocksPicker({ doc, update }: RogueSkillUnlocksPickerProps) {
  const level = rogueUnchainedLevel(doc);
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Rogue's Edge", false);

  if (level < 5) return null;

  const picks = doc.build.rogueSkillUnlocks ?? [];
  const unlockedTiers = unlockedRogueSkillUnlockTiers(doc);

  return (
    <div className="subsection weapon-training-picker">
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
        <h3>Rogue's Edge (UC)</h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint weapon-training-picker-hint">
            Pick a skill (5+ ranks) at 5th level and every 5 levels thereafter (10th, 15th, 20th) to
            gain its skill unlock power. The unlock's own tiered effects are prose-only and not
            tracked here — this is a record of which skill was chosen at each tier.
          </p>
          {Array.from({ length: unlockedTiers }, (_, tierIndex) => {
            const grantLevel = ROGUE_SKILL_UNLOCK_LEVELS[tierIndex]!;
            const chosen = picks[tierIndex] ?? "";
            return (
              <div className="weapon-training-tier" key={tierIndex}>
                <label>
                  <span className="hint">{grantLevel}th level</span>
                  <select
                    className="weapon-training-select"
                    value={chosen}
                    onChange={(e) =>
                      update((d) => setRogueSkillUnlock(d, tierIndex, e.target.value || null))
                    }
                  >
                    <option value="">— none chosen —</option>
                    {SKILL_OPTIONS.map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

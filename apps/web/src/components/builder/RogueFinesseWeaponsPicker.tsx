import { ROGUE_FINESSE_TRAINING_LEVELS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import {
  rogueUnchainedLevel,
  setRogueFinesseWeapon,
  unlockedRogueFinesseTiers,
} from "../../model/rogueFinesseWeapons.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface RogueFinesseWeaponsPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Rogue (Unchained) Finesse Training weapon-type picks (issue #65 —
 * previously deferred). PF1 RAW: at 3rd level, and every 8 levels thereafter
 * (11th, 19th), pick one weapon TYPE usable with Weapon Finesse (e.g.
 * "rapier") — melee attacks with a matching equipped weapon add Dexterity
 * instead of Strength to the damage roll. Free-text (not a `WEAPON_GROUPS`
 * dropdown, unlike `WeaponTrainingPicker` — RAW scopes this to one weapon
 * TYPE, not a whole semantic group), matched case-insensitively against an
 * equipped `WeaponInstance`'s name/group by `computeWeaponAttacks` in
 * `@pf1/engine` `compute.ts`. Free-choice — no validation that the entered
 * text matches an actual weapon on the sheet or is finesse-eligible, same
 * soft posture as every other picker here.
 */
export function RogueFinesseWeaponsPicker({ doc, update }: RogueFinesseWeaponsPickerProps) {
  const level = rogueUnchainedLevel(doc);
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Finesse Training", false);

  if (level < 3) return null;

  const picks = doc.build.rogueFinesseWeapons ?? [];
  const unlockedTiers = unlockedRogueFinesseTiers(doc);

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
        <h3>Finesse Training</h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint weapon-training-picker-hint">
            Pick a weapon TYPE (e.g. "rapier") at 3rd level and every 8 levels thereafter (11th,
            19th). Melee attacks with a matching equipped weapon add Dexterity instead of Strength
            to the damage roll — matched by name/group, case-insensitive, against the weapons on
            your Combat sheet. Free-choice — no validation that the weapon is finesse-eligible.
          </p>
          {Array.from({ length: unlockedTiers }, (_, tierIndex) => {
            const grantLevel = ROGUE_FINESSE_TRAINING_LEVELS[tierIndex]!;
            const chosen = picks[tierIndex] ?? "";
            return (
              <div className="weapon-training-tier" key={tierIndex}>
                <label>
                  <span className="hint">{grantLevel}th level</span>
                  <input
                    className="weapon-training-select"
                    type="text"
                    placeholder="e.g. rapier"
                    value={chosen}
                    onChange={(e) =>
                      update((d) => setRogueFinesseWeapon(d, tierIndex, e.target.value))
                    }
                  />
                </label>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

import {
  WEAPON_GROUPS,
  WEAPON_TRAINING_LEVELS,
  weaponTrainingBonus,
  weaponTrainingReplaced,
} from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { setWeaponTrainingGroup } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface WeaponTrainingPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/** Human-readable label for a `WEAPON_GROUPS` slug, e.g. "blades-light" -> "Blades Light". */
function groupLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Fighter's Weapon Training group picks (issue #45 — previously deferred;
 * built once the engine could express a semantic weapon-group target at all).
 * PF1 RAW: at 5th level and every 4 levels thereafter (9th/13th/17th), a
 * fighter picks one more weapon group; each pick's own bonus grows every
 * time a later tier unlocks (`@pf1/engine` `weaponTrainingBonus`). Free-
 * choice — no hard validation that groups are distinct or "sensible" for the
 * character's actual weapons, same soft posture as every other picker here.
 *
 * Hidden entirely when an active archetype has replaced Weapon Training
 * (`weaponTrainingReplaced`) — that archetype's own weapon-group bonus (if
 * any) comes from the archetype's own extracted/hand-verified entry instead,
 * and this picker would either do nothing or double-count if shown.
 */
export function WeaponTrainingPicker({ doc, update }: WeaponTrainingPickerProps) {
  const fighterLevel = doc.identity.classes.find((c) => c.tag === "fighter")?.level ?? 0;
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Weapon Training", false);

  if (fighterLevel < 5 || weaponTrainingReplaced(doc)) return null;

  const groups = doc.build.weaponTrainingGroups ?? [];
  const unlockedTiers = WEAPON_TRAINING_LEVELS.filter((lvl) => fighterLevel >= lvl).length;

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
        <h3>Weapon Training</h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint weapon-training-picker-hint">
            Pick a weapon group at 5th level and every four levels thereafter. Each pick's own bonus
            grows every time a later tier unlocks. Free-choice — no validation that a group matches
            a weapon you actually carry.
          </p>
          {Array.from({ length: unlockedTiers }, (_, tierIndex) => {
            const grantLevel = WEAPON_TRAINING_LEVELS[tierIndex]!;
            const chosen = groups[tierIndex] ?? "";
            const bonus = weaponTrainingBonus(fighterLevel, tierIndex);
            return (
              <div className="weapon-training-tier" key={tierIndex}>
                <label>
                  <span className="hint">
                    {grantLevel}th level{bonus > 0 ? ` (+${bonus})` : ""}
                  </span>
                  <select
                    className="weapon-training-select"
                    value={chosen}
                    onChange={(e) =>
                      update((d) => setWeaponTrainingGroup(d, tierIndex, e.target.value || null))
                    }
                  >
                    <option value="">— none chosen —</option>
                    {WEAPON_GROUPS.map((g) => (
                      <option key={g} value={g}>
                        {groupLabel(g)}
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

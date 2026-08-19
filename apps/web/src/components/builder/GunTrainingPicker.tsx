import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  activeGunTrainingPicksGrant,
  gunTrainingOptionPool,
  pickGroupSingularLabel,
  setGunTrainingPick,
  unlockedGunTrainingPicks,
} from "../../model/gunTraining.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface GunTrainingPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/** Human-readable label for a `WeaponRef.group` slug, e.g. "heavy-crossbow" -> "Heavy Crossbow". */
function groupLabel(slug: string): string {
  return slug
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Gun Training-family TYPE picks (Ultimate Combat) — the base gunslinger's
 * own Gun Training class feature, plus any "picks"-scope archetype
 * replacement (Bolt Ace's Crossbow Training picks crossbow types instead of
 * firearm types, at the same cadence). Renders nothing when no class has an
 * active "picks"-scope grant (`activeGunTrainingPicksGrant`) — including a
 * gunslinger who took musket master or pistolero, whose replacement Gun
 * Training is category-wide with no player choice at all.
 *
 * Options are the distinct weapon TYPES (`WeaponRef.group` slugs) present in
 * the vendored data for the active grant's `pickGroupTag`
 * (`gunTrainingOptionPool`), not free text — unlike Rogue (Unchained)'s
 * Finesse Training, which has no such catalog to draw from and so stays a
 * text field.
 */
export function GunTrainingPicker({ doc, refData, update }: GunTrainingPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Gun Training", false);

  // Below the grant's first unlock level (5th, for every modeled entry) there
  // are no tiers to pick yet — hidden entirely rather than showing an empty
  // hint, same posture as `WeaponTrainingPicker`'s `fighterLevel < 5` gate.
  const classesWithGrant = doc.identity.classes.filter(
    (c) =>
      activeGunTrainingPicksGrant(doc, c.tag) !== undefined &&
      unlockedGunTrainingPicks(doc, c.tag) > 0,
  );
  if (classesWithGrant.length === 0) return null;

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
        <h3>Gun Training</h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed &&
        classesWithGrant.map((cls) => {
          const grant = activeGunTrainingPicksGrant(doc, cls.tag)!;
          const pickGroupTag = grant.scope.pickGroupTag ?? "firearms";
          const typeLabel = pickGroupSingularLabel(pickGroupTag);
          const options = gunTrainingOptionPool(refData, pickGroupTag);
          const picks = doc.build.gunTrainingPicks?.[cls.tag] ?? [];
          const unlockedTiers = unlockedGunTrainingPicks(doc, cls.tag);
          return (
            <div key={cls.tag}>
              <p className="hint weapon-training-picker-hint">
                Pick one {typeLabel} type at each level below. Attacks with a matching {typeLabel}{" "}
                add your Dexterity modifier to damage.
              </p>
              {Array.from({ length: unlockedTiers }, (_, tierIndex) => {
                const grantLevel = grant.scope.unlockLevels[tierIndex]!;
                const chosen = picks[tierIndex] ?? "";
                return (
                  <div className="weapon-training-tier" key={tierIndex}>
                    <label>
                      <span className="hint">{grantLevel}th level</span>
                      <select
                        className="weapon-training-select"
                        value={chosen}
                        onChange={(e) =>
                          update((d) =>
                            setGunTrainingPick(d, cls.tag, tierIndex, e.target.value || null),
                          )
                        }
                      >
                        <option value="">None chosen</option>
                        {options.map((g) => (
                          <option key={g} value={g}>
                            {groupLabel(g)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                );
              })}
            </div>
          );
        })}
    </div>
  );
}

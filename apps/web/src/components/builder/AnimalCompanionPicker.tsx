import {
  BASE_COMPANIONS,
  companionAbilityIncreaseSlots,
  companionEffectiveLevel,
} from "@pf1/engine";
import type { AbilityId, CharacterDoc } from "@pf1/schema";

import {
  clearCompanion,
  setCompanion,
  setCompanionAbilityIncrease,
  setCompanionNotes,
  toggleCompanionSource,
} from "../../model/companion.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface AnimalCompanionPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

const ABILITY_OPTIONS: { id: AbilityId; label: string }[] = [
  { id: "str", label: "Str" },
  { id: "dex", label: "Dex" },
  { id: "con", label: "Con" },
  { id: "int", label: "Int" },
  { id: "wis", label: "Wis" },
  { id: "cha", label: "Cha" },
];

/**
 * Tracked animal companion (PF1 druid Nature Bond / ranger Hunter's Bond) —
 * species + name + which class feature(s) grant it, mirroring `FamiliarPicker`
 * closely. Unlike a familiar (class-agnostic — any feature can grant one),
 * a companion is ALWAYS sourced from a specific bond choice, so this only
 * renders for characters with druid levels (Nature Bond) or ranger levels ≥ 4
 * (Hunter's Bond) — both a druid choosing the domain option instead, and a
 * ranger below 4th level, simply see no picker yet.
 */
export function AnimalCompanionPicker({ doc, update }: AnimalCompanionPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:AnimalCompanion", false);
  const druidLevel = doc.identity.classes.find((c) => c.tag === "druid")?.level ?? 0;
  const rangerLevel = doc.identity.classes.find((c) => c.tag === "ranger")?.level ?? 0;
  const canNatureBond = druidLevel >= 1;
  const canHuntersBond = rangerLevel >= 4;
  if (!canNatureBond && !canHuntersBond) return null;

  const companion = doc.build.animalCompanion;
  const species = companion ? BASE_COMPANIONS[companion.speciesId] : undefined;
  const sources = companion?.source ?? [];
  const effectiveLevel = companionEffectiveLevel(doc);
  const increaseSlots = companionAbilityIncreaseSlots(effectiveLevel);
  const abilityIncreases = companion?.abilityIncreases ?? [];

  return (
    <div className="subsection animal-companion-picker">
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
        <h3>
          Animal Companion
          {companion ? <span className="hint"> · {companion.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint animal-companion-hint">
            A tracked companion gets its own stat block on the Play tab — HD, BAB, saves, AC,
            attacks, and skills, derived from its effective druid level. Choose which class
            feature(s) grant it below.
          </p>
          <div className="chips animal-companion-source">
            {canNatureBond && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("nature-bond")}
                onClick={() => update((d) => toggleCompanionSource(d, "nature-bond"))}
              >
                Nature Bond (druid {druidLevel})
              </button>
            )}
            {canHuntersBond && (
              <button
                type="button"
                className="chip"
                aria-pressed={sources.includes("hunters-bond")}
                onClick={() => update((d) => toggleCompanionSource(d, "hunters-bond"))}
              >
                Hunter's Bond (ranger {rangerLevel})
              </button>
            )}
          </div>

          {sources.length === 0 ? (
            <p className="hint">
              No companion source chosen yet — pick Nature Bond and/or Hunter's Bond above to add a
              companion.
            </p>
          ) : !companion ? (
            <button
              type="button"
              className="chip"
              onClick={() => update((d) => setCompanion(d, "wolf", "Companion"))}
            >
              Add a companion
            </button>
          ) : (
            <>
              <div className="familiar-fields animal-companion-fields">
                <select
                  className="familiar-select"
                  value={companion.speciesId}
                  onChange={(e) => update((d) => setCompanion(d, e.target.value, companion.name))}
                  aria-label="Companion species"
                >
                  {Object.entries(BASE_COMPANIONS).map(([id, def]) => (
                    <option key={id} value={id}>
                      {def.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="familiar-name"
                  placeholder="Name"
                  value={companion.name}
                  onChange={(e) =>
                    update((d) => setCompanion(d, companion.speciesId, e.target.value))
                  }
                  aria-label="Companion name"
                />
              </div>
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, tricks, house rules…)"
                value={companion.notes ?? ""}
                onChange={(e) => update((d) => setCompanionNotes(d, e.target.value))}
                aria-label="Companion notes"
              />
              {species && (
                <p className="hint familiar-effect">
                  {species.name}: {species.senses.join(", ")}. Speed{" "}
                  {Object.entries(species.speeds)
                    .map(([mode, ft]) => (mode === "land" ? `${ft} ft.` : `${mode} ${ft} ft.`))
                    .join(", ")}
                  . Effective level {effectiveLevel}.
                </p>
              )}
              {increaseSlots > 0 && (
                <div className="animal-companion-asi">
                  <span className="hint">Ability Score Increases:</span>
                  {Array.from({ length: increaseSlots }, (_, i) => (
                    <select
                      key={i}
                      className="familiar-select"
                      value={abilityIncreases[i] ?? "str"}
                      onChange={(e) =>
                        update((d) =>
                          setCompanionAbilityIncrease(d, i, e.target.value as AbilityId),
                        )
                      }
                      aria-label={`Ability Score Increase ${i + 1}`}
                    >
                      {ABILITY_OPTIONS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => clearCompanion(d))}
              >
                Remove companion
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

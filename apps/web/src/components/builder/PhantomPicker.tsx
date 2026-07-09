import { EMOTIONAL_FOCI, phantomAbilityIncreaseSlots, totalLevel } from "@pf1/engine";
import type { AbilityId, CharacterDoc } from "@pf1/schema";

import {
  clearPhantom,
  setPhantom,
  setPhantomAbilityIncrease,
  setPhantomNotes,
  setPhantomSize,
} from "../../model/phantom.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface PhantomPickerProps {
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

const SIZE_OPTIONS: { id: "sm" | "med" | "lg"; label: string }[] = [
  { id: "sm", label: "Small" },
  { id: "med", label: "Medium" },
  { id: "lg", label: "Large" },
];

/**
 * Tracked phantom (PF1 Occult Adventures Spiritualist's eidolon-like
 * companion) — Emotional Focus + name + size, mirroring `AnimalCompanionPicker`
 * closely. Always gated to spiritualist levels (unlike `FamiliarPicker`,
 * which is class-agnostic) since only the Spiritualist's own "Phantom" class
 * feature grants one.
 */
export function PhantomPicker({ doc, update }: PhantomPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Phantom", false);
  const spiritualistLevel = doc.identity.classes.find((c) => c.tag === "spiritualist")?.level ?? 0;
  if (spiritualistLevel < 1) return null;

  const phantom = doc.build.phantom;
  const focus = phantom ? EMOTIONAL_FOCI[phantom.focus] : undefined;
  const level = totalLevel(doc);
  const increaseSlots = phantomAbilityIncreaseSlots(level);
  const abilityIncreases = phantom?.abilityIncreases ?? [];

  return (
    <div className="subsection phantom-picker">
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
          Phantom
          {phantom ? <span className="hint"> · {phantom.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint familiar-hint">
            A tracked phantom gets its own stat block on the Play tab — HD, BAB, saves, AC, attacks,
            and skills, derived from your spiritualist level and its Emotional Focus.
          </p>
          {!phantom ? (
            <button
              type="button"
              className="chip"
              onClick={() => update((d) => setPhantom(d, "anger", "Phantom"))}
            >
              Add a phantom
            </button>
          ) : (
            <>
              <div className="familiar-fields">
                <select
                  className="familiar-select"
                  value={phantom.focus}
                  onChange={(e) => update((d) => setPhantom(d, e.target.value, phantom.name))}
                  aria-label="Emotional Focus"
                >
                  {Object.entries(EMOTIONAL_FOCI).map(([id, def]) => (
                    <option key={id} value={id}>
                      {def.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="familiar-name"
                  placeholder="Name"
                  value={phantom.name}
                  onChange={(e) => update((d) => setPhantom(d, phantom.focus, e.target.value))}
                  aria-label="Phantom name"
                />
              </div>
              <div className="familiar-fields">
                <select
                  className="familiar-select"
                  value={phantom.size ?? "med"}
                  onChange={(e) =>
                    update((d) => setPhantomSize(d, e.target.value as "sm" | "med" | "lg"))
                  }
                  aria-label="Phantom size"
                >
                  {SIZE_OPTIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, house rules…)"
                value={phantom.notes ?? ""}
                onChange={(e) => update((d) => setPhantomNotes(d, e.target.value))}
                aria-label="Phantom notes"
              />
              {focus && (
                <p className="hint familiar-effect">
                  {focus.name}: {focus.detail}
                </p>
              )}
              {increaseSlots > 0 && (
                <div className="animal-companion-asi">
                  <span className="hint">Ability Score Increases:</span>
                  {Array.from({ length: increaseSlots }, (_, i) => (
                    <select
                      key={i}
                      className="familiar-select"
                      value={abilityIncreases[i] ?? "cha"}
                      onChange={(e) =>
                        update((d) => setPhantomAbilityIncrease(d, i, e.target.value as AbilityId))
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
                onClick={() => update((d) => clearPhantom(d))}
              >
                Remove phantom
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

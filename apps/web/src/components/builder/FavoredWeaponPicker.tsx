import { useMemo } from "react";

import type { CharacterDoc, RefData } from "@pf1/schema";
import { grantsDeityFavoredWeapon } from "@pf1/engine";

import { favoredWeaponOptions, setDeityFavoredWeapon } from "../../model/doc.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface FavoredWeaponPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * The deity's favored weapon, for the classes that grant proficiency with it
 * (cleric, inquisitor, warpriest). Free-choice: nothing in the data maps a
 * deity to a weapon, and `identity.deity` is free text, so the player names
 * the weapon and the engine takes them at their word — soft-warning posture,
 * same as `DomainPicker`.
 *
 * Options are one per weapon `group` slug, which is the granularity the
 * proficiency check runs at: picking "Longbow" also covers a composite
 * longbow.
 */
export function FavoredWeaponPicker({ doc, refData, update }: FavoredWeaponPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:FavoredWeapon", false);

  const eligible = grantsDeityFavoredWeapon(doc, refData);
  const options = useMemo(() => favoredWeaponOptions(refData), [refData]);
  const byCategory = useMemo(
    () => ({
      simple: options.filter((o) => o.proficiency === "simple"),
      martial: options.filter((o) => o.proficiency === "martial"),
      exotic: options.filter((o) => o.proficiency === "exotic"),
    }),
    [options],
  );

  if (!eligible) return null;

  const chosen = doc.build.deityFavoredWeapon ?? "";
  const label = options.find((o) => o.slug === chosen)?.label;

  return (
    <div className="subsection favored-weapon-picker">
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
          Favored Weapon
          {label ? <span className="hint"> · {label}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint favored-weapon-picker-hint">
            Pick your deity's favored weapon. You are proficient with it whatever your class's
            normal weapon proficiency covers, so the sheet drops the non-proficient penalty on it.
            Free-choice: no deity validation. Leave unset if your deity's favored weapon is one you
            are already proficient with.
          </p>
          <select
            className="favored-weapon-select"
            aria-label="Deity's favored weapon"
            value={chosen}
            onChange={(e) => update((d) => setDeityFavoredWeapon(d, e.target.value || null))}
          >
            <option value="">None chosen</option>
            <optgroup label="Simple">
              {byCategory.simple.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Martial">
              {byCategory.martial.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Exotic">
              {byCategory.exotic.map((o) => (
                <option key={o.slug} value={o.slug}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          </select>
        </>
      )}
    </div>
  );
}

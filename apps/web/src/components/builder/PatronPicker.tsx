import { useMemo } from "react";

import { WITCH_PATRONS, WITCH_PATRON_TAGS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setWitchPatron } from "../../model/doc.js";
import { patronSpellsKnown } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface PatronPickerProps {
  doc: CharacterDoc;
  refData: RefData;
  update: Updater;
}

/**
 * Witch patron selection (issue #65), mirroring `MysteryPicker` almost
 * exactly. PF1 grants exactly one patron, chosen at L1, never changed
 * thereafter. Free-choice: no vendored patron-to-witch mapping exists, so
 * validation is "soft warning only" per the project's hybrid-prereqs
 * philosophy — same posture as `MysteryPicker`/`BloodlinePicker`.
 *
 * Scope: the 17 Advanced Player's Guide / Ultimate Magic "core" patrons — see
 * `@pf1/engine` `witch-patrons.ts`'s doc comment for the exact list and the
 * explicit exclusions (Protection is a later-splatbook patron; "Wards" and
 * "Portals" aren't real PF1 patrons at all).
 *
 * The chosen patron grants one bonus spell known (added to the familiar's
 * spells) at witch level 2 and every two levels thereafter — see
 * `model/spellcasting.patronSpellsKnown`, surfaced in the Spells section.
 * Unlike a mystery, a patron grants no bonus class skills.
 */
export function PatronPicker({ doc, refData, update }: PatronPickerProps) {
  const isWitch = doc.identity.classes.some((c) => c.tag === "witch");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Patron", false);

  const patrons = useMemo(() => [...WITCH_PATRON_TAGS].sort(), []);

  const chosen = doc.build.witchPatron ?? "";
  const patronDef = WITCH_PATRONS[chosen];
  const witchLevel = doc.identity.classes.find((c) => c.tag === "witch")?.level ?? 0;
  const bonusSpells = useMemo(
    () => (patronDef ? patronSpellsKnown(refData, chosen, 18) : []),
    [patronDef, refData, chosen],
  );

  if (!isWitch) return null;

  return (
    <div className="subsection mystery-picker">
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
          Patron
          {patronDef ? <span className="hint"> · {patronDef.name}</span> : null}
        </h3>
        <span className="panel-caret">{collapsed ? "▸" : "▾"}</span>
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one patron (PF1 grants one at level 1, never changed thereafter). It grants one
            bonus spell known (added to your familiar's spells) at witch level 2 and every two
            levels thereafter. Free-choice — no soft/hard validation.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setWitchPatron(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {patrons.map((tag) => (
              <option key={tag} value={tag}>
                {WITCH_PATRONS[tag]?.name ?? tag}
              </option>
            ))}
          </select>

          {patronDef && (
            <div className="mystery-preview">
              <ul className="mystery-bonus-spells">
                {bonusSpells.map((sp) => (
                  <li key={`${sp.level}-${sp.id}`}>
                    <span className="cf-level">Witch Lv {sp.level}</span>{" "}
                    <span className="cf-name">
                      {sp.name}
                      {sp.level > witchLevel && witchLevel > 0 ? " (not yet unlocked)" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

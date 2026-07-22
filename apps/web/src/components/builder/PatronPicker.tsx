import { useMemo } from "react";

import { mergedWitchPatronCatalog } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { setWitchPatron } from "../../model/doc.js";
import { patronSpellsKnown } from "../../model/spellcasting.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";
import { FeatureDescription } from "./ClassFeaturesList.js";

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
 * Browses the FULL published patron catalog (`mergedWitchPatronCatalog`,
 * issue #74 Phase 3c) — the 17 Advanced Player's Guide/Ultimate Magic "core"
 * patrons keep their hand-verified bonus-spell progression (marked
 * `badge-modeled` "M", surfaced via `model/spellcasting.patronSpellsKnown` at
 * witch level 2 and every two levels thereafter); the ~44 other vendored-only
 * patrons (including the "unique" themed patrons) show their full vendored
 * prose instead — no bonus spells known for those (this app has no vendored
 * spell-id mapping for them, see `@pf1/engine` `witch-patrons.ts`'s doc
 * comment).
 */
export function PatronPicker({ doc, refData, update }: PatronPickerProps) {
  const isWitch = doc.identity.classes.some((c) => c.tag === "witch");
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Patron", false);

  const catalog = useMemo(
    () => [...mergedWitchPatronCatalog(refData)].sort((a, b) => a.name.localeCompare(b.name)),
    [refData],
  );

  const chosen = doc.build.witchPatron ?? "";
  const patronDef = catalog.find((p) => p.tag === chosen);
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
          {patronDef ? (
            <span className="hint">
              {" "}
              · {patronDef.name}
              {!patronDef.displayOnly && <span className="badge-modeled"> M</span>}
            </span>
          ) : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint mystery-picker-hint">
            Pick one patron (PF1 grants one at level 1, never changed thereafter). Browses the full
            published catalog; entries marked <span className="badge-modeled">M</span> grant one
            bonus spell known (added to your familiar's spells) at witch level 2 and every two
            levels thereafter — the rest show their full published prose instead. Free-choice — no
            soft/hard validation.
          </p>
          <select
            className="mystery-select"
            value={chosen}
            onChange={(e) => update((d) => setWitchPatron(d, e.target.value || null))}
          >
            <option value="">— none chosen —</option>
            {catalog.map((p) => (
              <option key={p.tag} value={p.tag}>
                {p.name}
                {p.displayOnly ? "" : " (M)"}
              </option>
            ))}
          </select>

          {patronDef &&
            (patronDef.displayOnly ? (
              patronDef.description ? (
                <FeatureDescription html={patronDef.description} />
              ) : null
            ) : (
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
            ))}
        </>
      )}
    </div>
  );
}

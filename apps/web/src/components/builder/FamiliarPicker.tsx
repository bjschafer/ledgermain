import { useMemo, useState } from "react";

import { BASE_FAMILIARS } from "@pf1/engine";
import type { CharacterDoc } from "@pf1/schema";

import { clearFamiliar, setFamiliar, setFamiliarNotes } from "../../model/familiar.js";
import {
  familiarSpeciesOptions,
  filterFamiliarSpecies,
  formatFamiliarSpeciesAttacks,
  formatFamiliarSpeciesSummary,
} from "../../model/familiarDisplay.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface FamiliarPickerProps {
  doc: CharacterDoc;
  update: Updater;
}

/**
 * Tracked familiar (PF1 arcane familiar) — species + name. Class-agnostic:
 * unlike `ArcaneBondPicker` (Wizard's arcane-bond CHOICE between a familiar
 * and a bonded object, master-bonus-only), this models the familiar itself as
 * a full trackable creature (see `@pf1/engine` `deriveFamiliar` / the
 * tracker's `FamiliarPanel`) — any class/feature that grants a familiar
 * (Wizard arcane bond, an Arcanist exploit, a feat, ...) uses this, so no
 * single class check could gate it. `ClassesSection` renders this only when
 * `model/familiar.ts`'s `hasFamiliarSource` finds a plausible source (or an
 * existing tracked familiar already), so a class with no such feature or
 * feat (a kineticist, say) never sees it.
 *
 * The species list is a single searchable `.pick-row` catalog (not a plain
 * `<select>`) so a player can compare species side by side — each row shows
 * its size, speed, senses, natural attacks, and published master bonus
 * before committing. The same list both creates the familiar (no row
 * selected yet) and re-species an existing one (the current species shows
 * `is-selected`); `setFamiliar` keeps the name in sync (see its doc comment).
 */
export function FamiliarPicker({ doc, update }: FamiliarPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Familiar", false);
  const [query, setQuery] = useState("");
  const familiar = doc.build.familiar;
  const species = familiar ? BASE_FAMILIARS[familiar.speciesId] : undefined;

  const options = useMemo(() => familiarSpeciesOptions(), []);
  const shown = filterFamiliarSpecies(options, query);

  return (
    <div className="subsection familiar-picker">
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
          Familiar
          {familiar ? <span className="hint"> · {familiar.name}</span> : null}
        </h3>
        <Caret open={!collapsed} />
      </div>
      {!collapsed && (
        <>
          <p className="hint familiar-hint">
            A tracked familiar gets its own stat block on the Play tab: HP, AC, saves, attacks, and
            skills, derived from your level and this species. Its published master bonus (e.g. a
            cat's +3 Stealth) and Alertness (while it's within arm's reach) apply automatically to
            your own sheet.
          </p>

          {familiar && (
            <>
              <input
                type="text"
                className="familiar-name"
                placeholder={species ? `Name (defaults to "${species.name}")` : "Name"}
                value={familiar.name}
                onChange={(e) => update((d) => setFamiliar(d, familiar.speciesId, e.target.value))}
                aria-label="Familiar name"
              />
              <textarea
                className="familiar-notes"
                placeholder="Notes (personality, tricks, house rules…)"
                value={familiar.notes ?? ""}
                onChange={(e) => update((d) => setFamiliarNotes(d, e.target.value))}
                aria-label="Familiar notes"
              />
              {species && (
                <p className="hint familiar-effect">
                  {species.name}: {formatFamiliarSpeciesSummary(species)}.
                </p>
              )}
              {(() => {
                const opt = options.find((o) => o.id === familiar.speciesId);
                if (!opt || (!opt.masterBonus && !opt.masterBonusNote)) return null;
                return (
                  <p className="hint familiar-effect">
                    {opt.masterBonus
                      ? `Master bonus: ${opt.masterBonus} (applied to your sheet).`
                      : null}
                    {opt.masterBonusNote ? ` ${opt.species.name}: ${opt.masterBonusNote}.` : null}
                  </p>
                );
              })()}
              <button
                type="button"
                className="btn-ghost"
                onClick={() => update((d) => clearFamiliar(d))}
              >
                Remove familiar
              </button>
            </>
          )}

          <input
            className="search"
            type="text"
            placeholder={`Search ${options.length} familiar species…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Familiar species"
          />
          <div className="scroll">
            {shown.length === 0 ? (
              <div className="empty">No species match.</div>
            ) : (
              shown.map((o) => {
                const isSelected = familiar?.speciesId === o.id;
                const attacks = formatFamiliarSpeciesAttacks(o.species.attacks);
                return (
                  <div key={o.id} className={`pick-row${isSelected ? " is-selected" : ""}`}>
                    <div className="pmain">
                      <div className="pname">{o.species.name}</div>
                      <div className="preq">
                        <span>{formatFamiliarSpeciesSummary(o.species)}</span>
                        {attacks && <span>{attacks}</span>}
                      </div>
                      {(o.masterBonus || o.masterBonusNote) && (
                        <div className="preq">
                          <span className="desc-text">
                            {o.masterBonus ? `Master bonus: ${o.masterBonus}.` : null}
                            {o.masterBonusNote ? ` ${o.masterBonusNote}.` : null}
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="pick-btn"
                      onClick={() => update((d) => setFamiliar(d, o.id, familiar?.name ?? ""))}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

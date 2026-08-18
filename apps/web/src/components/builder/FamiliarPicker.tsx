import { useMemo, useState } from "react";

import { BASE_FAMILIARS, IMPROVED_FAMILIARS } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  clearFamiliar,
  improvedFamiliarPrereqWarnings,
  setFamiliar,
  setFamiliarNotes,
  setFamiliarTemplate,
} from "../../model/familiar.js";
import {
  familiarSpeciesOptions,
  familiarTemplateOptions,
  filterFamiliarSpecies,
  filterImprovedFamiliarOptions,
  formatFamiliarSpeciesAttacks,
  formatFamiliarSpeciesSummary,
  improvedFamiliarOptions,
} from "../../model/familiarDisplay.js";
import { useCollapsed } from "../../state/useCollapsed.js";
import { Caret } from "../Caret.js";

type Updater = (fn: (doc: CharacterDoc) => CharacterDoc) => void;

interface FamiliarPickerProps {
  doc: CharacterDoc;
  refData: RefData;
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
 *
 * Below the standard catalog, the same search box also filters a second
 * "Improved familiars" catalog (`improvedFamiliarOptions`) — non-animal
 * species from the Improved Familiar feat. Its published prerequisites
 * (caster level, the feat itself, alignment) show as soft warning text per
 * row (`improvedFamiliarPrereqWarnings`); the pick is never blocked, same
 * hybrid-prereq posture as the rest of the app. When the CURRENT species is
 * a standard animal (not itself improved), a template `<select>` lets the
 * player layer an Improved Familiar template (celestial, etc.) on top —
 * templates and improved species are mutually exclusive, so that control
 * only appears for a standard animal.
 */
export function FamiliarPicker({ doc, refData, update }: FamiliarPickerProps) {
  const [collapsed, toggleCollapsed] = useCollapsed("subsection:Familiar", false);
  const [query, setQuery] = useState("");
  const familiar = doc.build.familiar;
  const species = familiar ? BASE_FAMILIARS[familiar.speciesId] : undefined;
  const currentIsImproved = familiar != null && IMPROVED_FAMILIARS[familiar.speciesId] != null;

  const options = useMemo(() => familiarSpeciesOptions(), []);
  const shown = filterFamiliarSpecies(options, query);

  const improvedOptions = useMemo(() => improvedFamiliarOptions(), []);
  const shownImproved = filterImprovedFamiliarOptions(improvedOptions, query);

  const templateOptions = useMemo(() => familiarTemplateOptions(), []);
  const selectedTemplate = familiar?.template
    ? templateOptions.find((t) => t.id === familiar.template)
    : undefined;
  const templateWarnings = selectedTemplate
    ? improvedFamiliarPrereqWarnings(doc, refData, selectedTemplate.template.prereq)
    : [];

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
              {!currentIsImproved && (
                <div className="familiar-template-select">
                  <label>
                    <span className="hint">Improved Familiar template</span>
                    <select
                      value={familiar.template ?? ""}
                      onChange={(e) =>
                        update((d) => setFamiliarTemplate(d, e.target.value || undefined))
                      }
                    >
                      <option value="">None</option>
                      {templateOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {selectedTemplate && (
                    <p className="hint familiar-effect">
                      {selectedTemplate.template.name}: {selectedTemplate.defensesLine}.{" "}
                      {selectedTemplate.template.note}
                    </p>
                  )}
                  {templateWarnings.length > 0 && (
                    <p className="hint familiar-prereq-warning">{templateWarnings.join(". ")}</p>
                  )}
                </div>
              )}
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

          <h4 className="tracker-sub familiar-improved-heading">Improved familiars</h4>
          <p className="hint familiar-hint">
            Non-animal species from the Improved Familiar feat. Prerequisites show as warnings below
            each option: picking one is never blocked, even if a prerequisite isn't met yet.
          </p>
          <div className="scroll">
            {shownImproved.length === 0 ? (
              <div className="empty">No improved familiars match.</div>
            ) : (
              shownImproved.map((o) => {
                const isSelected = familiar?.speciesId === o.id;
                const warnings = improvedFamiliarPrereqWarnings(doc, refData, o.species.prereq);
                return (
                  <div
                    key={o.id}
                    className={`pick-row${isSelected ? " is-selected" : ""}${warnings.length > 0 ? " is-unqualified" : ""}`}
                  >
                    <div className="pmain">
                      <div className="pname">{o.species.name}</div>
                      <div className="preq">
                        <span>{o.compareLine}</span>
                      </div>
                      {o.defensesLine && (
                        <div className="preq">
                          <span className="desc-text">{o.defensesLine}</span>
                        </div>
                      )}
                      {o.slaHint && (
                        <div className="preq">
                          <span className="desc-text">{o.slaHint}</span>
                        </div>
                      )}
                      <div className="preq">
                        <span className="desc-text">{o.prereqLine}</span>
                      </div>
                      {warnings.length > 0 && (
                        <div className="preq">
                          <span className="desc-text familiar-prereq-warning">
                            {warnings.join(". ")}
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
